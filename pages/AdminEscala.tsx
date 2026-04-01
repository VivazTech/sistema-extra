import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useExtras } from '../context/ExtraContext';
import { supabase } from '../services/supabase';
import { Save, FileText, ChevronLeft, ChevronRight, Loader2, Plus, Edit2, Trash2, X, CalendarDays } from 'lucide-react';
import { DatabaseLoading } from '../components/LoadingLottie';
import { EscalaRecord, EscalaUser, Employee } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const LEGENDA: Record<string, string> = {
  P: 'Plantão',
  Ai: 'Afastamento INSS',
  Lm: 'Licença Maternidade',
  Fe: 'Feriado',
  Fr: 'Férias',
  F: 'Folga',
};

// Obter total de dias num mês
function getDaysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

function getDayOfWeek(day: number, month: number, year: number) {
  // month is 1-indexed here, but JS Date uses 0-indexed month
  return new Date(year, month - 1, day).getDay();
}

const AdminEscala: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { sectors, shifts, employeeSchedules, employees, addEmployee, updateEmployee, deleteEmployee } = useExtras();
  
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  });
  
  const [selectedSector, setSelectedSector] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [escalaRecord, setEscalaRecord] = useState<EscalaRecord | null>(null);
  const [escalaUsers, setEscalaUsers] = useState<EscalaUser[]>([]);
  const [isModalNewEmployeeOpen, setIsModalNewEmployeeOpen] = useState(false);
  const [modalEmployeeName, setModalEmployeeName] = useState('');
  const [modalEmployeeSectorId, setModalEmployeeSectorId] = useState('');
  const [modalEmployeeTurnos, setModalEmployeeTurnos] = useState<string[]>([]);
  const [modalEmployeeEscalaTime, setModalEmployeeEscalaTime] = useState('');
  const [modalEmployeeFixedDayOff, setModalEmployeeFixedDayOff] = useState<number>(-1);
  const [modalEmployeeFixedDayOffDate, setModalEmployeeFixedDayOffDate] = useState('');
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [isModalFeriasOpen, setIsModalFeriasOpen] = useState(false);
  const [feriasEmployeeId, setFeriasEmployeeId] = useState<string | null>(null);
  const [feriasSaida, setFeriasSaida] = useState('');
  const [feriasVolta, setFeriasVolta] = useState('');

  // Filter users by sector
  const sectorUsers = useMemo(() => {
    if (!selectedSector) return [];
    return employees.filter(e => e.sector === selectedSector).sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, selectedSector]);

  useEffect(() => {
    if (selectedSector) {
      loadEscala();
    } else {
      setEscalaRecord(null);
      setEscalaUsers([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSector, currentMonth, sectorUsers.length]);

  const loadEscala = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('escalas')
        .select('*')
        .eq('sector', selectedSector)
        .eq('month', currentMonth.month)
        .eq('year', currentMonth.year)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const dbData = data?.data as EscalaUser[] | undefined;
      
      // Merge with existing users in the sector in case new users were added
      const mergedUsers: EscalaUser[] = sectorUsers.map(u => {
        const existing = dbData?.find(d => d.userId === u.id);
        if (existing) {
          return {
            ...existing,
            userName: u.name, // always update name
            // Férias vêm dos funcionários cadastrados (não do JSON da escala mensal).
            // Se já existe um registro de "escalas" salvo, pode não conter "vacations";
            // então fazemos merge com u.vacations.
            vacations: Array.isArray(existing.vacations) || Array.isArray(u.feriasDates)
              ? Array.from(new Set([...(existing.vacations || []), ...(u.feriasDates || [])]))
              : undefined,
          };
        }
        return {
          userId: u.id,
          userName: u.name,
          fixedDayOff: typeof u.fixedDayOff === 'number' ? u.fixedDayOff : -1, // Not configured
          escalaTime: u.escalaTime?.trim() ? u.escalaTime : 'Sem Escala',
          extraDaysOff: [],
          holidays: [],
          vacations: Array.isArray(u.feriasDates) ? u.feriasDates : [],
          customDays: {},
        };
      });

      if (data) {
        setEscalaRecord({
          id: data.id,
          month: data.month,
          year: data.year,
          sector: data.sector,
          data: mergedUsers,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        });
      } else {
        setEscalaRecord(null);
      }
      
      setEscalaUsers(mergedUsers);
    } catch (err: any) {
      console.error('Erro ao carregar escala:', err);
      alert('Não foi possível carregar a escala. Verifique a tabela no Supabase.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedSector) return;
    setSaving(true);
    try {
      const payload = {
        month: currentMonth.month,
        year: currentMonth.year,
        sector: selectedSector,
        data: escalaUsers,
        updated_at: new Date().toISOString(),
      };

      if (escalaRecord) {
        // Update
        const { error } = await supabase
          .from('escalas')
          .update(payload)
          .eq('id', escalaRecord.id);
        if (error) throw error;
      } else {
        // Insert
        const { data, error } = await supabase
          .from('escalas')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        
        if (data) {
          setEscalaRecord({
            id: data.id,
            month: data.month,
            year: data.year,
            sector: data.sector,
            data: data.data,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          });
        }
      }
      
      alert('Escala salva com sucesso!');
    } catch (err: any) {
      console.error('Erro ao salvar escala:', err);
      alert('Erro ao salvar escala. Verifique se executou o script SQL.');
    } finally {
      setSaving(false);
    }
  };

  const changeMonth = (diff: number) => {
    let newM = currentMonth.month + diff;
    let newY = currentMonth.year;
    if (newM > 12) { newM = 1; newY++; }
    if (newM < 1) { newM = 12; newY--; }
    setCurrentMonth({ month: newM, year: newY });
  };

  const updateUserField = (userId: string, field: keyof EscalaUser, value: any) => {
    setEscalaUsers(prev => prev.map(u => u.userId === userId ? { ...u, [field]: value } : u));
  };

  const toggleExtraDayOff = (userId: string, dateStr: string) => {
    setEscalaUsers(prev => prev.map(u => {
      if (u.userId !== userId) return u;
      const arr = u.extraDaysOff || [];
      const newArr = arr.includes(dateStr) 
        ? arr.filter(d => d !== dateStr)
        : [...arr, dateStr].sort();
      return { ...u, extraDaysOff: newArr };
    }));
  };

  const allEmployeesSorted = useMemo(
    () => [...employees].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [employees]
  );

  const handleStartEditEmployee = (emp: Employee) => {
    setEditingEmployeeId(emp.id);
    setModalEmployeeName(emp.name || '');
    setModalEmployeeSectorId(emp.sectorId || '');
    setModalEmployeeTurnos(emp.turnos && emp.turnos.length > 0 ? [emp.turnos[0]] : []);
    setModalEmployeeEscalaTime(emp.escalaTime || '');
    setModalEmployeeFixedDayOff(typeof emp.fixedDayOff === 'number' ? emp.fixedDayOff : -1);
    setIsModalNewEmployeeOpen(true);
  };

  const handleSaveEmployee = async () => {
    if (!editingEmployeeId) return;
    const name = modalEmployeeName.trim();
    if (!name || !modalEmployeeSectorId) {
      alert('Informe o nome e selecione o setor do funcionário.');
      return;
    }
    if (modalEmployeeTurnos.length === 0) {
      alert('Selecione pelo menos 1 turno para o funcionário.');
      return;
    }
    if (!modalEmployeeEscalaTime.trim()) {
      alert('Informe a escala (horário de trabalho) do funcionário.');
      return;
    }
    if (modalEmployeeFixedDayOff < 0) {
      alert('Selecione o dia fixo de folga do funcionário.');
      return;
    }
    try {
      await updateEmployee(editingEmployeeId, {
        name,
        sectorId: modalEmployeeSectorId,
        turnos: modalEmployeeTurnos,
        escalaTime: modalEmployeeEscalaTime.trim(),
        fixedDayOff: modalEmployeeFixedDayOff,
      });
      setEditingEmployeeId(null);
      handleCloseNewEmployeeModal();
      alert('Funcionário atualizado com sucesso.');
    } catch {
      alert('Erro ao atualizar funcionário. Tente novamente.');
    }
  };

  const handleCancelEditEmployee = () => {
    setEditingEmployeeId(null);
    handleCloseNewEmployeeModal();
  };

  const handleOpenNewEmployeeModal = () => {
    setModalEmployeeName('');
    setModalEmployeeSectorId('');
    setModalEmployeeTurnos([]);
    setModalEmployeeEscalaTime('');
    setModalEmployeeFixedDayOff(-1);
    setModalEmployeeFixedDayOffDate('');
    setIsModalNewEmployeeOpen(true);
  };

  const handleCloseNewEmployeeModal = () => {
    setIsModalNewEmployeeOpen(false);
    setEditingEmployeeId(null);
    setModalEmployeeName('');
    setModalEmployeeSectorId('');
    setModalEmployeeTurnos([]);
    setModalEmployeeEscalaTime('');
    setModalEmployeeFixedDayOff(-1);
    setModalEmployeeFixedDayOffDate('');
  };

  const handleAddEmployee = async () => {
    const name = modalEmployeeName.trim();
    if (!name || !modalEmployeeSectorId) {
      alert('Informe o nome e selecione o setor do funcionário.');
      return;
    }
    if (modalEmployeeTurnos.length === 0) {
      alert('Selecione pelo menos 1 turno para o funcionário.');
      return;
    }
    if (!modalEmployeeEscalaTime.trim()) {
      alert('Informe a escala (horário de trabalho) do funcionário.');
      return;
    }
    if (modalEmployeeFixedDayOff < 0) {
      alert('Selecione o dia fixo de folga do funcionário.');
      return;
    }
    try {
      const created = await addEmployee({
        name,
        sector: '',
        sectorId: modalEmployeeSectorId,
        turnos: modalEmployeeTurnos,
        escalaTime: modalEmployeeEscalaTime.trim(),
        fixedDayOff: modalEmployeeFixedDayOff,
      });
      if (created) {
        handleCloseNewEmployeeModal();
        alert('Funcionário cadastrado com sucesso.');
      }
    } catch {
      alert('Erro ao cadastrar funcionário. Tente novamente.');
    }
  };

  function toDateKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function enumerateDatesInclusive(startStr: string, endStr: string): string[] {
    const start = new Date(`${startStr}T12:00:00`);
    const end = new Date(`${endStr}T12:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];
    const out: string[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      out.push(toDateKey(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  }

  const handleOpenFeriasModal = (emp: Employee) => {
    setFeriasEmployeeId(emp.id);
    setFeriasSaida('');
    setFeriasVolta('');
    setIsModalFeriasOpen(true);
  };

  const handleCloseFeriasModal = () => {
    setIsModalFeriasOpen(false);
    setFeriasEmployeeId(null);
    setFeriasSaida('');
    setFeriasVolta('');
  };

  const handleSaveFerias = async () => {
    if (!feriasEmployeeId) return;
    if (!feriasSaida || !feriasVolta) {
      alert('Informe as datas de saída e volta.');
      return;
    }
    if (new Date(`${feriasSaida}T12:00:00`) > new Date(`${feriasVolta}T12:00:00`)) {
      alert('A data de saída não pode ser maior que a data de volta.');
      return;
    }
    const rangeDates = enumerateDatesInclusive(feriasSaida, feriasVolta);
    if (rangeDates.length === 0) return;
    const emp = employees.find(e => e.id === feriasEmployeeId);
    const merged = Array.from(new Set([...(emp?.feriasDates || []), ...rangeDates])).sort();
    try {
      await updateEmployee(feriasEmployeeId, { feriasDates: merged });
      handleCloseFeriasModal();
      alert('Férias cadastradas com sucesso.');
    } catch {
      alert('Erro ao cadastrar férias. Tente novamente.');
    }
  };

  const handleGeneratePDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const monthName = monthNames[currentMonth.month - 1];
    const daysInMonth = getDaysInMonth(currentMonth.month, currentMonth.year);

    // Titulo
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Escala de Trabalho', 15, 20);

    // Cabecalho infos
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Período:', 15, 30);
    doc.text('Empregador:', 15, 36);
    doc.text('CPF/CNPJ:', 15, 42);
    doc.text('Local de Trabalho/Setor:', 15, 48);

    doc.setFont('helvetica', 'normal');
    doc.text(`${monthName} de ${currentMonth.year}`, 55, 30);
    doc.text('VIVAZ CATARATAS HOTEL & RESORT LTDA', 55, 36);
    doc.text('44.572.567/0001-08', 55, 42);
    doc.text(selectedSector.toUpperCase() || 'NÃO DEFINIDO', 55, 48);

    // Tabela Headers
    const headRow1 = [{ content: 'Colaborador', rowSpan: 2 }, { content: 'Escala', rowSpan: 2 }];
    const headRow2 = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dw = getDayOfWeek(d, currentMonth.month, currentMonth.year);
      headRow1.push({ content: DIAS_SEMANA[dw], colSpan: 1, styles: { halign: 'center' } } as any);
      headRow2.push({ content: String(d).padStart(2, '0'), styles: { halign: 'center' } });
    }

    const body = escalaUsers.map(eu => {
      const row: any[] = [eu.userName, eu.escalaTime || ''];
      
      for (let d = 1; d <= daysInMonth; d++) {
        const dw = getDayOfWeek(d, currentMonth.month, currentMonth.year);
        const dateStr = `${currentMonth.year}-${String(currentMonth.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        
        let cellVal = 'P';
        
        // Verifica customizations com prioridade:
        // Férias > Feriados > Outras folgas > Folga fixa
        if (eu.vacations?.includes(dateStr)) cellVal = 'Fr';
        else if (eu.holidays?.includes(dateStr)) cellVal = 'Fe';
        else if (eu.extraDaysOff?.includes(dateStr)) cellVal = 'F';
        else if (eu.fixedDayOff === dw) cellVal = 'F';
        // Sem Escala = vazio
        if (eu.escalaTime?.toLowerCase() === 'sem escala') cellVal = '';
        
        row.push(cellVal);
      }
      return row;
    });

    autoTable(doc, {
      startY: 55,
      head: [headRow1, headRow2],
      body: body,
      theme: 'grid',
      styles: { fontSize: 7, halign: 'center', valign: 'middle', cellPadding: 1, lineWidth: 0.2, lineColor: [40,40,40] },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      columnStyles: {
        0: { halign: 'left', minCellWidth: 40 },
        1: { minCellWidth: 20 },
      },
    });

    // Legenda + Assinaturas
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Legenda table
    autoTable(doc, {
      startY: finalY,
      margin: { left: 15 },
      tableWidth: 50,
      head: [['LEGENDA', '']],
      body: Object.entries(LEGENDA),
      theme: 'grid',
      styles: { fontSize: 7, halign: 'center' },
      headStyles: { fillColor: [240,240,240], textColor: [0,0,0], halign: 'center' },
      columnStyles: { 0: { fontStyle: 'bold', minCellWidth: 15 } }
    });

    // Validations Box
    autoTable(doc, {
      startY: finalY,
      margin: { left: 75 },
      tableWidth: 100,
      head: [[{ content: 'VALIDAÇÕES DA ESCALA', colSpan: 2, styles: { halign: 'center' } }]],
      body: [
        ['Assinatura e carimbo\nResponsável setor:', ''],
        ['Assinatura e carimbo\nRecursos Humanos:', '']
      ],
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [240,240,240], textColor: [0,0,0] },
      columnStyles: { 0: { minCellWidth: 40, halign: 'right' }, 1: { minCellWidth: 60 } }
    });

    doc.save(`Escala_${selectedSector}_${monthName}_${currentMonth.year}.pdf`);
  };

  if (currentUser?.role !== 'ADMIN') {
    return <div className="p-8 text-red-600 font-bold">Acesso negado. Apenas administradores.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Funcionários Registrados</h2>
          <button
            onClick={handleOpenNewEmployeeModal}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold text-xs shadow-md"
          >
            <Plus size={16} /> Novo Funcionário
          </button>
        </div>
        <div className="space-y-2 max-h-[320px] overflow-y-auto">
          {allEmployeesSorted.length === 0 && (
            <p className="text-xs text-gray-400 italic">Nenhum funcionário cadastrado.</p>
          )}
          {allEmployeesSorted.map((item) => (
            <div key={item.id} className="flex items-center gap-2 border border-gray-100 rounded-lg p-2">
              <span className="flex-1 text-sm font-medium text-gray-700">{item.name}</span>
              <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-md">{item.sector}</span>
              <button
                onClick={() => handleStartEditEmployee(item)}
                className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                title="Editar funcionário"
              >
                <Edit2 size={16} />
              </button>
              <button onClick={() => handleOpenFeriasModal(item)} className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg" title="Cadastrar férias">
                <CalendarDays size={16} />
              </button>
              <button
                onClick={async () => {
                  if (!confirm('Excluir este funcionário?')) return;
                  try {
                    await deleteEmployee(item.id);
                    alert('Funcionário excluído com sucesso.');
                  } catch {
                    alert('Erro ao excluir funcionário. Tente novamente.');
                  }
                }}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                title="Excluir funcionário"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Escala de Serviço</h1>
          <p className="text-sm text-gray-500">Programe a escala mensal dos funcionários por setor.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleGeneratePDF}
            disabled={!selectedSector || escalaUsers.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm shadow-md disabled:opacity-50"
          >
            <FileText size={18} />
            Gerar PDF
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedSector || saving || loading}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold text-sm shadow-md disabled:opacity-50"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Salvar Escala
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-wrap items-center gap-6">
        <label className="flex flex-col gap-1 w-full max-w-xs">
          <span className="text-xs font-bold text-gray-500 uppercase">Setor</span>
          <select
            value={selectedSector}
            onChange={e => setSelectedSector(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="">-- Selecione o Setor --</option>
            {sectors.map(s => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-4 border border-gray-200 rounded-xl p-1 bg-gray-50 max-w-xs mx-auto md:mx-0">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white rounded-lg text-gray-600 shadow-sm transition-colors cursor-pointer">
            <ChevronLeft size={18} />
          </button>
          <span className="font-bold text-emerald-900 min-w-[120px] text-center">
            {String(currentMonth.month).padStart(2, '0')} / {currentMonth.year}
          </span>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white rounded-lg text-gray-600 shadow-sm transition-colors cursor-pointer">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {loading ? (
        <DatabaseLoading message="Carregando escala…" minHeight="min-h-[50vh]" />
      ) : !selectedSector ? (
        <div className="p-12 text-center text-gray-400">Selecione um setor acima para carregar a escala.</div>
      ) : escalaUsers.length === 0 ? (
        <div className="p-12 text-center text-gray-400">Nenhum usuário registrado com este setor. Vá em Usuários e edite o perfil adicionando setores.</div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-x-auto">
            <h2 className="text-lg font-bold mb-4">Configuração dos Funcionários</h2>
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-3 border-b">Colaborador</th>
                  <th className="px-4 py-3 border-b">Horário (Escala)</th>
                  <th className="px-4 py-3 border-b">Outras Folgas no Mês</th>
                  <th className="px-4 py-3 border-b text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm border-b">
                {escalaUsers.map(eu => (
                  <tr key={eu.userId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-800">{eu.userName}</td>
                    <td className="px-4 py-3">
                      <input 
                        type="text" 
                        value={eu.escalaTime} 
                        onChange={e => updateUserField(eu.userId, 'escalaTime', e.target.value)}
                        placeholder="Ex: 08:00 12:00 13:00 17:00"
                        className="border border-gray-200 rounded px-2 py-1 w-full max-w-[200px] outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 items-center">
                        {eu.extraDaysOff?.map(d => (
                          <span key={d} className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                            {d.split('-')[2]}
                            <button onClick={() => toggleExtraDayOff(eu.userId, d)} className="hover:text-red-500">&times;</button>
                          </span>
                        ))}
                        <input 
                          type="date"
                          className="border border-gray-200 rounded px-1 text-xs outline-none"
                          onChange={e => {
                            if (e.target.value) {
                              toggleExtraDayOff(eu.userId, e.target.value);
                              e.target.value = ''; // reset
                            }
                          }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        title="Salvar alterações na escala"
                        className="px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm disabled:opacity-50 min-w-[80px] ml-auto"
                      >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Lançar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-x-auto">
            <h2 className="text-lg font-bold mb-4">Preview (Visão Geral do Mês)</h2>
            <div className="pb-4">
              <table className="w-max text-center border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100 text-[10px] uppercase text-gray-600 font-bold whitespace-nowrap">
                    <th className="border p-1 text-left min-w-[200px]" rowSpan={2}>Colaborador</th>
                    <th className="border p-1" rowSpan={2}>Escala</th>
                    {Array.from({ length: getDaysInMonth(currentMonth.month, currentMonth.year) }).map((_, i) => (
                      <th key={i} className="border p-1 font-medium w-8">
                        {DIAS_SEMANA[getDayOfWeek(i + 1, currentMonth.month, currentMonth.year)]}
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-gray-100 text-[10px] text-gray-700 font-bold">
                    {Array.from({ length: getDaysInMonth(currentMonth.month, currentMonth.year) }).map((_, i) => (
                      <th key={i} className="border p-1">{String(i + 1).padStart(2, '0')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-[11px] font-medium text-gray-800">
                  {escalaUsers.map(eu => (
                    <tr key={eu.userId} className="hover:bg-emerald-50">
                      <td className="border p-1 text-left truncate max-w-[200px]">{eu.userName}</td>
                      <td className="border p-1 min-w-[60px]">{eu.escalaTime}</td>
                      {Array.from({ length: getDaysInMonth(currentMonth.month, currentMonth.year) }).map((_, i) => {
                        const d = i + 1;
                        const dw = getDayOfWeek(d, currentMonth.month, currentMonth.year);
                        const dateStr = `${currentMonth.year}-${String(currentMonth.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                        
                        let cellVal = 'P';
                        let bgClass = '';
                        
                        if (eu.vacations?.includes(dateStr)) {
                          cellVal = 'Fr'; bgClass = 'bg-rose-100 text-rose-700 font-bold';
                        } else if (eu.holidays?.includes(dateStr)) {
                          cellVal = 'Fe'; bgClass = 'bg-yellow-100';
                        } else if (eu.extraDaysOff?.includes(dateStr)) {
                          cellVal = 'F'; bgClass = 'bg-gray-200 text-gray-600 font-bold';
                        } else if (eu.fixedDayOff === dw) {
                          cellVal = 'F'; bgClass = 'bg-gray-100 text-gray-500';
                        }
                        
                        // Override para sem escala
                        if (eu.escalaTime?.toLowerCase() === 'sem escala') {
                          cellVal = ''; bgClass = 'bg-gray-50';
                        }

                        return (
                          <td key={i} className={`border p-1 ${bgClass}`}>
                            {cellVal}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Legenda</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {Object.entries(LEGENDA).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="w-6 h-6 flex items-center justify-center bg-white border border-gray-300 rounded text-xs font-bold text-gray-700 shadow-sm">
                      {key}
                    </span>
                    <span className="text-xs text-gray-600 font-medium">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalNewEmployeeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">{editingEmployeeId ? 'Editar Funcionário' : 'Novo Funcionário'}</h3>
              <button onClick={handleCloseNewEmployeeModal} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Nome do funcionário *</label>
                <input type="text" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500" value={modalEmployeeName} onChange={(e) => setModalEmployeeName(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Setor *</label>
                <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500" value={modalEmployeeSectorId} onChange={(e) => setModalEmployeeSectorId(e.target.value)}>
                  <option value="">Selecione o setor...</option>
                  {sectors.map((sector) => (
                    <option key={sector.id} value={sector.id}>{sector.name}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Turno *</label>
                <select
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  value={modalEmployeeTurnos[0] || ''}
                  onChange={(e) => setModalEmployeeTurnos(e.target.value ? [e.target.value] : [])}
                >
                  <option value="">Selecione o turno...</option>
                  {shifts.map((s) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Escala (horário de trabalho) *</label>
                <select
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  value={modalEmployeeEscalaTime}
                  onChange={(e) => setModalEmployeeEscalaTime(e.target.value)}
                >
                  <option value="">Selecione a escala...</option>
                  {modalEmployeeEscalaTime &&
                    !employeeSchedules.some((s) => `${s.entryTime} - ${s.exitTime}` === modalEmployeeEscalaTime) && (
                      <option value={modalEmployeeEscalaTime}>{modalEmployeeEscalaTime}</option>
                    )}
                  {employeeSchedules.map((s) => {
                    const label = `${s.entryTime} - ${s.exitTime}`;
                    return (
                      <option key={s.id} value={label}>
                        {label}
                      </option>
                    );
                  })}
                </select>
                {employeeSchedules.length === 0 && (
                  <p className="text-xs text-gray-500 mt-2">Nenhuma escala cadastrada em `Cadastros`.</p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Dia de folga fixa *</label>
                <select
                  value={modalEmployeeFixedDayOff}
                  onChange={(e) => setModalEmployeeFixedDayOff(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value={-1}>Selecione...</option>
                  <option value={0}>Domingo</option>
                  <option value={1}>Segunda-feira</option>
                  <option value={2}>Terça-feira</option>
                  <option value={3}>Quarta-feira</option>
                  <option value={4}>Quinta-feira</option>
                  <option value={5}>Sexta-feira</option>
                  <option value={6}>Sábado</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={editingEmployeeId ? handleSaveEmployee : handleAddEmployee}
                className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700"
              >
                {editingEmployeeId ? 'Salvar alterações' : 'Salvar'}
              </button>
              <button
                type="button"
                onClick={editingEmployeeId ? handleCancelEditEmployee : handleCloseNewEmployeeModal}
                className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-200"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalFeriasOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Cadastrar Férias</h3>
              <button onClick={handleCloseFeriasModal} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Data de saída *</label>
              <input type="date" value={feriasSaida} onChange={(e) => setFeriasSaida(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Data de volta *</label>
              <input type="date" value={feriasVolta} onChange={(e) => setFeriasVolta(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={handleSaveFerias} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700">Salvar</button>
              <button type="button" onClick={handleCloseFeriasModal} className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-200">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEscala;

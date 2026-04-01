import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Edit2, Save, X, Search, ChevronDown, ChevronUp, CalendarDays } from 'lucide-react';
import { useExtras } from '../context/ExtraContext';
import { RequesterItem, ReasonItem, ShiftItem, Sector, Employee, EmployeeScheduleItem, PjEmployee } from '../types';

const AdminCatalogs: React.FC = () => {
  const {
    sectors,
    requesters,
    reasons,
    shifts,
    employeeSchedules,
    addSector,
    updateSector,
    deleteSector,
    addRequester,
    updateRequester,
    deleteRequester,
    addReason,
    updateReason,
    deleteReason,
    addShift,
    updateShift,
    deleteShift,
    addEmployeeSchedule,
    updateEmployeeSchedule,
    deleteEmployeeSchedule,
    employees,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    pjEmployees,
    addPjEmployee,
    updatePjEmployee,
    deletePjEmployee,
  } = useExtras();

  const [isEditingSector, setIsEditingSector] = useState<string | null>(null);
  const [editSector, setEditSector] = useState<Sector | null>(null);
  const [searchSector, setSearchSector] = useState('');
  const [expandedSectors, setExpandedSectors] = useState<Set<string>>(new Set());
  const [isModalNewSectorOpen, setIsModalNewSectorOpen] = useState(false);
  const [newSectorName, setNewSectorName] = useState('');
  const [newSectorRoles, setNewSectorRoles] = useState<string[]>(['']);
  const [editingReasonId, setEditingReasonId] = useState<string | null>(null);
  const [editReasonName, setEditReasonName] = useState('');
  const [editReasonMaxValue, setEditReasonMaxValue] = useState<string>('');
  const [newReasonName, setNewReasonName] = useState('');
  const [newReasonMaxValue, setNewReasonMaxValue] = useState<string>('');

  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeSectorId, setNewEmployeeSectorId] = useState('');
  const [isModalNewEmployeeOpen, setIsModalNewEmployeeOpen] = useState(false);
  const [modalEmployeeName, setModalEmployeeName] = useState('');
  const [modalEmployeeSectorId, setModalEmployeeSectorId] = useState('');
  const [modalEmployeeTurnos, setModalEmployeeTurnos] = useState<string[]>([]);
  const [modalEmployeeEscalaTime, setModalEmployeeEscalaTime] = useState('');
  const [modalEmployeeFixedDayOff, setModalEmployeeFixedDayOff] = useState<number>(-1);
  const [modalEmployeeFixedDayOffDate, setModalEmployeeFixedDayOffDate] = useState<string>('');

  const [isModalFeriasOpen, setIsModalFeriasOpen] = useState(false);
  const [feriasEmployeeId, setFeriasEmployeeId] = useState<string | null>(null);
  const [feriasSaida, setFeriasSaida] = useState<string>('');
  const [feriasVolta, setFeriasVolta] = useState<string>('');
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [editEmployeeName, setEditEmployeeName] = useState('');
  const [editEmployeeSectorId, setEditEmployeeSectorId] = useState('');

  const [newPjName, setNewPjName] = useState('');
  const [newPjSectorId, setNewPjSectorId] = useState('');
  const [editingPjId, setEditingPjId] = useState<string | null>(null);
  const [editPjName, setEditPjName] = useState('');
  const [editPjSectorId, setEditPjSectorId] = useState('');

  const handleStartEditSector = (sector: Sector) => {
    setIsEditingSector(sector.id);
    setEditSector({ ...sector });
  };

  const handleSaveSector = async () => {
    if (editSector) {
      await updateSector(editSector.id, editSector);
      setIsEditingSector(null);
      setEditSector(null);
    }
  };

  const handleOpenNewSectorModal = () => {
    setNewSectorName('');
    setNewSectorRoles(['']);
    setIsModalNewSectorOpen(true);
  };

  const handleCloseNewSectorModal = () => {
    setIsModalNewSectorOpen(false);
    setNewSectorName('');
    setNewSectorRoles(['']);
  };

  const handleAddNewSectorRole = () => {
    setNewSectorRoles(prev => [...prev, '']);
  };

  const handleUpdateNewSectorRole = (idx: number, val: string) => {
    setNewSectorRoles(prev => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  const handleRemoveNewSectorRole = (idx: number) => {
    setNewSectorRoles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveNewSector = async () => {
    const name = newSectorName.trim();
    if (!name) return;
    const roles = newSectorRoles.map(r => r.trim()).filter(Boolean);
    const newSector: Sector = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      roles: roles.length > 0 ? roles : [],
    };
    await addSector(newSector);
    handleCloseNewSectorModal();
  };

  const handleAddRole = () => {
    if (editSector) {
      setEditSector({ ...editSector, roles: [...editSector.roles, ''] });
    }
  };

  const handleUpdateRole = (idx: number, val: string) => {
    if (editSector) {
      const newRoles = [...editSector.roles];
      newRoles[idx] = val;
      setEditSector({ ...editSector, roles: newRoles });
    }
  };

  const handleRemoveRole = (idx: number) => {
    if (editSector) {
      setEditSector({ ...editSector, roles: editSector.roles.filter((_, i) => i !== idx) });
    }
  };

  const toggleSectorExpansion = (sectorId: string) => {
    setExpandedSectors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectorId)) {
        newSet.delete(sectorId);
      } else {
        newSet.add(sectorId);
      }
      return newSet;
    });
  };

  const handleStartEditReason = (item: ReasonItem) => {
    setEditingReasonId(item.id);
    setEditReasonName(item.name);
    setEditReasonMaxValue(item.maxValue != null ? String(item.maxValue) : '');
  };

  const handleSaveReason = async () => {
    if (!editingReasonId) return;
    const name = editReasonName.trim();
    if (!name) return;
    const maxVal = editReasonMaxValue.trim() === '' ? undefined : parseFloat(editReasonMaxValue);
    await updateReason(editingReasonId, {
      id: editingReasonId,
      name,
      maxValue: maxVal != null && !Number.isNaN(maxVal) ? maxVal : undefined,
    });
    setEditingReasonId(null);
    setEditReasonName('');
    setEditReasonMaxValue('');
  };

  const handleCancelEditReason = () => {
    setEditingReasonId(null);
    setEditReasonName('');
    setEditReasonMaxValue('');
  };

  const handleAddReason = async () => {
    const name = newReasonName.trim();
    if (!name) {
      alert('Informe o nome do motivo.');
      return;
    }
    try {
      const maxVal = newReasonMaxValue.trim() === '' ? undefined : parseFloat(newReasonMaxValue);
      const created = await addReason({
        id: Math.random().toString(36).substr(2, 9),
        name,
        maxValue: maxVal != null && !Number.isNaN(maxVal) ? maxVal : undefined,
      });
      if (created) {
        setNewReasonName('');
        setNewReasonMaxValue('');
        alert('Motivo cadastrado com sucesso.');
      } else {
        alert('Erro ao cadastrar motivo. Tente novamente.');
      }
    } catch {
      alert('Erro ao cadastrar motivo. Tente novamente.');
    }
  };

  const [newRequesterName, setNewRequesterName] = useState('');
  const [editingRequesterId, setEditingRequesterId] = useState<string | null>(null);
  const [editRequesterValue, setEditRequesterValue] = useState('');
  const [newShiftName, setNewShiftName] = useState('');
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [editShiftValue, setEditShiftValue] = useState('');
  const [newScheduleEntryTime, setNewScheduleEntryTime] = useState('');
  const [newScheduleExitTime, setNewScheduleExitTime] = useState('');
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [editScheduleEntryTime, setEditScheduleEntryTime] = useState('');
  const [editScheduleExitTime, setEditScheduleExitTime] = useState('');

  const handleStartEditRequester = (item: RequesterItem) => {
    setEditingRequesterId(item.id);
    setEditRequesterValue(item.name);
  };

  const handleSaveRequester = async () => {
    if (!editingRequesterId) return;
    const name = editRequesterValue.trim();
    if (!name) {
      alert('Informe o nome do demandante.');
      return;
    }
    try {
      await updateRequester(editingRequesterId, { id: editingRequesterId, name });
      setEditingRequesterId(null);
      setEditRequesterValue('');
      alert('Demandante atualizado com sucesso.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar alterações. Tente novamente.';
      alert(msg);
    }
  };

  const handleCancelEditRequester = () => {
    setEditingRequesterId(null);
    setEditRequesterValue('');
  };

  const handleAddRequester = async () => {
    const name = newRequesterName.trim();
    if (!name) {
      alert('Informe o nome do demandante.');
      return;
    }
    try {
      const created = await addRequester({
        id: Math.random().toString(36).substr(2, 9),
        name,
      });
      if (created) {
        setNewRequesterName('');
        alert('Demandante cadastrado com sucesso.');
      } else {
        alert('Erro ao cadastrar demandante. Tente novamente.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao cadastrar demandante. Tente novamente.';
      alert(msg);
    }
  };

  const handleStartEditShift = (item: ShiftItem) => {
    setEditingShiftId(item.id);
    setEditShiftValue(item.name);
  };

  const handleSaveShift = async () => {
    if (!editingShiftId) return;
    const name = editShiftValue.trim();
    if (!name) return;
    await updateShift(editingShiftId, { id: editingShiftId, name });
    setEditingShiftId(null);
    setEditShiftValue('');
  };

  const handleCancelEditShift = () => {
    setEditingShiftId(null);
    setEditShiftValue('');
  };

  const handleAddShift = async () => {
    const name = newShiftName.trim();
    if (!name) {
      alert('Informe o nome do turno.');
      return;
    }
    try {
      const created = await addShift({
        id: Math.random().toString(36).substr(2, 9),
        name,
      });
      if (created) {
        setNewShiftName('');
        alert('Turno cadastrado com sucesso.');
      } else {
        alert('Erro ao cadastrar turno. Tente novamente.');
      }
    } catch {
      alert('Erro ao cadastrar turno. Tente novamente.');
    }
  };

  const formatScheduleLabel = (item: { entryTime: string; exitTime: string }) => `${item.entryTime} - ${item.exitTime}`;

  const handleStartEditSchedule = (item: EmployeeScheduleItem) => {
    setEditingScheduleId(item.id);
    setEditScheduleEntryTime(item.entryTime);
    setEditScheduleExitTime(item.exitTime);
  };

  const handleCancelEditSchedule = () => {
    setEditingScheduleId(null);
    setEditScheduleEntryTime('');
    setEditScheduleExitTime('');
  };

  const handleSaveSchedule = async () => {
    if (!editingScheduleId) return;
    if (!editScheduleEntryTime || !editScheduleExitTime) {
      alert('Informe hora de entrada e hora de saída.');
      return;
    }
    await updateEmployeeSchedule(editingScheduleId, {
      entryTime: editScheduleEntryTime,
      exitTime: editScheduleExitTime,
    });
    handleCancelEditSchedule();
  };

  const handleAddSchedule = async () => {
    if (!newScheduleEntryTime || !newScheduleExitTime) {
      alert('Informe hora de entrada e hora de saída.');
      return;
    }
    const created = await addEmployeeSchedule({
      entryTime: newScheduleEntryTime,
      exitTime: newScheduleExitTime,
    });
    if (created) {
      setNewScheduleEntryTime('');
      setNewScheduleExitTime('');
      alert('Escala cadastrada com sucesso.');
      return;
    }
    alert('Erro ao cadastrar escala. Tente novamente.');
  };

  const handleStartEditEmployee = (emp: Employee) => {
    setEditingEmployeeId(emp.id);
    setEditEmployeeName(emp.name);
    setEditEmployeeSectorId(emp.sectorId || '');
  };

  const handleSaveEmployee = async () => {
    if (!editingEmployeeId) return;
    const name = editEmployeeName.trim();
    if (!name || !editEmployeeSectorId) {
      alert('Informe o nome e selecione o setor do funcionário.');
      return;
    }
    try {
      await updateEmployee(editingEmployeeId, { name, sectorId: editEmployeeSectorId });
      setEditingEmployeeId(null);
      setEditEmployeeName('');
      setEditEmployeeSectorId('');
      alert('Funcionário atualizado com sucesso.');
    } catch {
      alert('Erro ao atualizar funcionário. Tente novamente.');
    }
  };

  const handleCancelEditEmployee = () => {
    setEditingEmployeeId(null);
    setEditEmployeeName('');
    setEditEmployeeSectorId('');
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
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
    if (start > end) return [];
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
    const saida = new Date(`${feriasSaida}T12:00:00`);
    const volta = new Date(`${feriasVolta}T12:00:00`);
    if (Number.isNaN(saida.getTime()) || Number.isNaN(volta.getTime())) {
      alert('Datas inválidas.');
      return;
    }
    if (saida > volta) {
      alert('A data de saída não pode ser maior que a data de volta.');
      return;
    }

    const rangeDates = enumerateDatesInclusive(feriasSaida, feriasVolta);
    if (rangeDates.length === 0) {
      alert('Não foi possível gerar o intervalo de datas.');
      return;
    }

    const emp = employees.find(e => e.id === feriasEmployeeId);
    const existing = emp?.feriasDates ?? [];
    const merged = Array.from(new Set([...existing, ...rangeDates])).sort();

    try {
      await updateEmployee(feriasEmployeeId, { feriasDates: merged });
      handleCloseFeriasModal();
      alert('Férias cadastradas com sucesso.');
    } catch (err) {
      console.error(err);
      alert('Erro ao cadastrar férias. Tente novamente.');
    }
  };

  const handleOpenNewEmployeeModal = () => {
    setModalEmployeeName(newEmployeeName);
    setModalEmployeeSectorId(newEmployeeSectorId);
    setModalEmployeeTurnos([]);
    setModalEmployeeEscalaTime('');
    setModalEmployeeFixedDayOff(-1);
    setModalEmployeeFixedDayOffDate('');
    setIsModalNewEmployeeOpen(true);
  };

  const handleCloseNewEmployeeModal = () => {
    setIsModalNewEmployeeOpen(false);
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
        setNewEmployeeName('');
        setNewEmployeeSectorId('');
        handleCloseNewEmployeeModal();
        alert('Funcionário cadastrado com sucesso.');
      } else {
        alert('Erro ao cadastrar funcionário. Tente novamente.');
      }
    } catch {
      alert('Erro ao cadastrar funcionário. Tente novamente.');
    }
  };

  // Filtrar setores por pesquisa
  const filteredSectors = useMemo(() => {
    if (!searchSector.trim()) return sectors;
    const searchLower = searchSector.toLowerCase();
    return sectors.filter(sector => 
      sector.name.toLowerCase().includes(searchLower) ||
      sector.roles.some(role => role.toLowerCase().includes(searchLower))
    );
  }, [sectors, searchSector]);

  const handleAddPj = async () => {
    const name = newPjName.trim();
    if (!name || !newPjSectorId) {
      alert('Informe nome e setor.');
      return;
    }
    try {
      const created = await addPjEmployee({ name, sectorId: newPjSectorId });
      if (created) {
        setNewPjName('');
        setNewPjSectorId('');
      }
    } catch {
      alert('Erro ao cadastrar funcionário PJ.');
    }
  };

  const handleStartEditPj = (e: PjEmployee) => {
    setEditingPjId(e.id);
    setEditPjName(e.name);
    setEditPjSectorId(e.sectorId || '');
  };

  const handleSavePj = async () => {
    if (!editingPjId) return;
    const name = editPjName.trim();
    if (!name || !editPjSectorId) {
      alert('Informe nome e setor.');
      return;
    }
    try {
      await updatePjEmployee(editingPjId, { name, sectorId: editPjSectorId });
      setEditingPjId(null);
    } catch {
      alert('Erro ao salvar.');
    }
  };

  const handleCancelEditPj = () => {
    setEditingPjId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Cadastros do Sistema</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Demandantes</h2>
            <div className="flex gap-2 items-center flex-wrap">
              <input
                type="text"
                placeholder="Nome do demandante"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-48"
                value={newRequesterName}
                onChange={(e) => setNewRequesterName(e.target.value)}
              />
              <button
                onClick={handleAddRequester}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold text-xs shadow-md"
              >
                <Plus size={16} /> Novo Demandante
              </button>
            </div>
          </div>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {requesters.length === 0 && (
              <p className="text-xs text-gray-400 italic">Nenhum demandante cadastrado.</p>
            )}
            {requesters.map((item) => (
              <div key={item.id} className="flex items-center gap-2 border border-gray-100 rounded-lg p-2">
                {editingRequesterId === item.id ? (
                  <>
                    <input
                      type="text"
                      className="flex-1 border-b border-emerald-500 outline-none px-2 py-1 text-sm"
                      value={editRequesterValue}
                      onChange={(e) => setEditRequesterValue(e.target.value)}
                      placeholder="Nome"
                    />
                    <button onClick={handleSaveRequester} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                      <Save size={16} />
                    </button>
                    <button onClick={handleCancelEditRequester} className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg">
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium text-gray-700">{item.name}</span>
                    <button onClick={() => handleStartEditRequester(item)} className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg">
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm('Excluir este demandante?')) return;
                        try {
                          await deleteRequester(item.id);
                          alert('Demandante excluído com sucesso.');
                        } catch (err) {
                          const msg = err instanceof Error ? err.message : 'Erro ao excluir demandante. Tente novamente.';
                          alert(msg);
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Motivos da Solicitação</h2>
            <div className="flex gap-2 items-center flex-wrap">
              <input
                type="text"
                placeholder="Nome do motivo"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-40"
                value={newReasonName}
                onChange={(e) => setNewReasonName(e.target.value)}
              />
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Valor máx. (R$)"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-28"
                value={newReasonMaxValue}
                onChange={(e) => setNewReasonMaxValue(e.target.value)}
              />
              <button
                onClick={handleAddReason}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold text-xs shadow-md"
              >
                <Plus size={16} /> Novo Motivo
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {reasons.length === 0 && (
              <p className="text-xs text-gray-400 italic">Nenhum motivo cadastrado.</p>
            )}
            {reasons.map((item) => (
              <div key={item.id} className="flex items-center gap-2 border border-gray-100 rounded-lg p-2">
                {editingReasonId === item.id ? (
                  <>
                    <input
                      type="text"
                      className="flex-1 border-b border-emerald-500 outline-none px-2 py-1 text-sm"
                      value={editReasonName}
                      onChange={(e) => setEditReasonName(e.target.value)}
                      placeholder="Nome"
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-24 border-b border-emerald-500 outline-none px-2 py-1 text-sm"
                      value={editReasonMaxValue}
                      onChange={(e) => setEditReasonMaxValue(e.target.value)}
                      placeholder="Máx. R$"
                    />
                    <button onClick={handleSaveReason} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                      <Save size={16} />
                    </button>
                    <button onClick={handleCancelEditReason} className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg">
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium text-gray-700">{item.name}</span>
                    <span className="text-xs text-gray-500 w-24">
                      {item.maxValue != null ? `R$ ${Number(item.maxValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Sem limite'}
                    </span>
                    <button onClick={() => handleStartEditReason(item)} className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => deleteReason(item.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">Valor máximo: limite em R$ para o campo &quot;Valor Combinado&quot; na solicitação de extra quando este motivo for selecionado.</p>
          <p className="text-xs text-amber-600 mt-1">Para o motivo <strong>TESTE</strong>, defina sempre o valor máximo; caso contrário a solicitação não poderá ser salva.</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Turnos</h2>
            <div className="flex gap-2 items-center flex-wrap">
              <input
                type="text"
                placeholder="Nome do turno"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-40"
                value={newShiftName}
                onChange={(e) => setNewShiftName(e.target.value)}
              />
              <button
                onClick={handleAddShift}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold text-xs shadow-md"
              >
                <Plus size={16} /> Novo Turno
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {shifts.length === 0 && (
              <p className="text-xs text-gray-400 italic">Nenhum turno cadastrado.</p>
            )}
            {shifts.map((item) => (
              <div key={item.id} className="flex items-center gap-2 border border-gray-100 rounded-lg p-2">
                {editingShiftId === item.id ? (
                  <>
                    <input
                      type="text"
                      className="flex-1 border-b border-emerald-500 outline-none px-2 py-1 text-sm"
                      value={editShiftValue}
                      onChange={(e) => setEditShiftValue(e.target.value)}
                      placeholder="Nome"
                    />
                    <button onClick={handleSaveShift} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                      <Save size={16} />
                    </button>
                    <button onClick={handleCancelEditShift} className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg">
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium text-gray-700">{item.name}</span>
                    <button onClick={() => handleStartEditShift(item)} className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => deleteShift(item.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Escalas (Hora de Entrada e Saída)</h2>
            <div className="flex gap-2 items-center flex-wrap">
              <input
                type="time"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                value={newScheduleEntryTime}
                onChange={(e) => setNewScheduleEntryTime(e.target.value)}
              />
              <input
                type="time"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                value={newScheduleExitTime}
                onChange={(e) => setNewScheduleExitTime(e.target.value)}
              />
              <button
                onClick={handleAddSchedule}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold text-xs shadow-md"
              >
                <Plus size={16} /> Nova Escala
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {employeeSchedules.length === 0 && (
              <p className="text-xs text-gray-400 italic">Nenhuma escala cadastrada.</p>
            )}
            {employeeSchedules.map((item) => (
              <div key={item.id} className="flex items-center gap-2 border border-gray-100 rounded-lg p-2">
                {editingScheduleId === item.id ? (
                  <>
                    <input
                      type="time"
                      className="border border-gray-200 rounded-lg px-2 py-1 text-sm"
                      value={editScheduleEntryTime}
                      onChange={(e) => setEditScheduleEntryTime(e.target.value)}
                    />
                    <input
                      type="time"
                      className="border border-gray-200 rounded-lg px-2 py-1 text-sm"
                      value={editScheduleExitTime}
                      onChange={(e) => setEditScheduleExitTime(e.target.value)}
                    />
                    <button onClick={handleSaveSchedule} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                      <Save size={16} />
                    </button>
                    <button onClick={handleCancelEditSchedule} className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg">
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium text-gray-700">{formatScheduleLabel(item)}</span>
                    <button onClick={() => handleStartEditSchedule(item)} className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => deleteEmployeeSchedule(item.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 min-w-0">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900">Funcionários PJ</h2>
          <p className="text-sm text-gray-500 mt-1">
            Cadastro para a Portaria PJ — nome e setor (sem vínculo com valores de extras).
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-end mb-4">
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Nome</label>
            <input
              type="text"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Nome completo"
              value={newPjName}
              onChange={(e) => setNewPjName(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-52">
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Setor</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              value={newPjSectorId}
              onChange={(e) => setNewPjSectorId(e.target.value)}
            >
              <option value="">Selecione…</option>
              {sectors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleAddPj}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold text-sm"
          >
            <Plus size={16} /> Adicionar PJ
          </button>
        </div>
        <div className="space-y-2 max-h-[320px] overflow-y-auto">
          {pjEmployees.length === 0 && (
            <p className="text-xs text-gray-400 italic">Nenhum funcionário PJ cadastrado.</p>
          )}
          {pjEmployees.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center gap-2 border border-gray-100 rounded-lg p-2">
              {editingPjId === item.id ? (
                <>
                  <input
                    type="text"
                    className="flex-1 min-w-[120px] border-b border-emerald-500 outline-none px-2 py-1 text-sm"
                    value={editPjName}
                    onChange={(e) => setEditPjName(e.target.value)}
                  />
                  <select
                    className="border border-gray-200 rounded-lg px-2 py-1 text-sm min-w-[140px]"
                    value={editPjSectorId}
                    onChange={(e) => setEditPjSectorId(e.target.value)}
                  >
                    {sectors.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={handleSavePj} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                    <Save size={16} />
                  </button>
                  <button type="button" onClick={handleCancelEditPj} className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg">
                    <X size={16} />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium text-gray-700">{item.name}</span>
                  <span className="text-sm text-gray-500 min-w-[100px]">{item.sector || '—'}</span>
                  <button type="button" onClick={() => handleStartEditPj(item)} className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg">
                    <Edit2 size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm('Excluir este funcionário PJ?')) return;
                      try {
                        await deletePjEmployee(item.id);
                      } catch {
                        alert('Erro ao excluir.');
                      }
                    }}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Setores e Funções</h2>
          <button 
            onClick={handleOpenNewSectorModal}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold text-sm shadow-md"
          >
            <Plus size={18} /> Novo Setor
          </button>
        </div>

        {/* Barra de Pesquisa */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Pesquisar setor ou função..."
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            value={searchSector}
            onChange={(e) => setSearchSector(e.target.value)}
          />
        </div>

        {/* Lista de Setores */}
        <div className="space-y-2">
          {filteredSectors.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-8">
              {searchSector ? 'Nenhum setor encontrado com essa pesquisa.' : 'Nenhum setor cadastrado.'}
            </p>
          ) : (
            filteredSectors.map(sector => {
              const isExpanded = expandedSectors.has(sector.id);
              const isEditing = isEditingSector === sector.id;

              return (
                <div key={sector.id} className={`bg-white border rounded-xl transition-all ${isEditing ? 'ring-2 ring-emerald-500 border-emerald-500' : 'border-gray-200'}`}>
                  {isEditing ? (
                    <div className="p-4 space-y-4">
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Nome do Setor</label>
                        <input 
                          type="text"
                          className="w-full text-lg font-bold border-b-2 border-emerald-500 outline-none p-2"
                          value={editSector?.name}
                          onChange={(e) => setEditSector({ ...editSector!, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Funções</label>
                        <div className="space-y-2">
                          {editSector?.roles.map((role, idx) => (
                            <div key={idx} className="flex gap-2">
                              <input 
                                type="text"
                                className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                                value={role}
                                onChange={(e) => handleUpdateRole(idx, e.target.value)}
                              />
                              <button onClick={() => handleRemoveRole(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                          <button 
                            onClick={handleAddRole}
                            className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-xs font-bold text-gray-400 hover:border-emerald-300 hover:text-emerald-500 transition-all"
                          >
                            + Adicionar Função
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button onClick={handleSaveSector} className="flex-1 bg-emerald-600 text-white py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                          <Save size={16} /> Salvar
                        </button>
                        <button onClick={() => setIsEditingSector(null)} className="flex-1 bg-gray-100 text-gray-500 py-2 rounded-xl text-sm font-bold">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div 
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => toggleSectorExpansion(sector.id)}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {isExpanded ? (
                            <ChevronUp className="text-gray-400" size={20} />
                          ) : (
                            <ChevronDown className="text-gray-400" size={20} />
                          )}
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900">{sector.name}</h3>
                            <p className="text-xs text-gray-500 mt-1">
                              {sector.roles.length} {sector.roles.length === 1 ? 'função' : 'funções'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEditSector(sector);
                            }} 
                            className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={async (e) => {
                              e.stopPropagation();
                              await deleteSector(sector.id);
                            }} 
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-gray-100 pt-4">
                          <div className="flex flex-wrap gap-2">
                            {sector.roles.length > 0 ? (
                              sector.roles.map((role, i) => (
                                <span key={i} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold">
                                  {role}
                                </span>
                              ))
                            ) : (
                              <p className="text-xs text-gray-400 italic">Sem funções cadastradas.</p>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="bg-blue-50 rounded-2xl shadow-sm border border-blue-200 p-6">
        <h2 className="text-lg font-bold text-blue-900 mb-2">Funcionários Registrados</h2>
        <p className="text-sm text-blue-800">
          A gestão de funcionários foi movida para a seção <strong>Escalas</strong>.
        </p>
      </div>

      {/* Modal Novo Funcionário */}
      {isModalNewEmployeeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Novo Funcionário</h3>
              <button
                onClick={handleCloseNewEmployeeModal}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Nome do funcionário *</label>
                <input
                  type="text"
                  placeholder="Ex.: José Beltrán Dias"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  value={modalEmployeeName}
                  onChange={(e) => setModalEmployeeName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Setor *</label>
                <select
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  value={modalEmployeeSectorId}
                  onChange={(e) => setModalEmployeeSectorId(e.target.value)}
                >
                  <option value="">Selecione o setor...</option>
                  {sectors.map((sector) => (
                    <option key={sector.id} value={sector.id}>
                      {sector.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Turno *</label>
                {shifts.length === 0 ? (
                  <p className="text-sm text-gray-500">Nenhum turno cadastrado em `Cadastros &gt; Turnos`.</p>
                ) : (
                  <>
                    <select
                      multiple
                      size={4}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      value={modalEmployeeTurnos}
                      onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions).map(o => o.value);
                        setModalEmployeeTurnos(selected);
                      }}
                    >
                      {shifts.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-2">
                      Dica: para selecionar mais de um turno, segure `Ctrl` (ou `Cmd` no Mac).
                    </p>
                  </>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Escala (horário de trabalho) *</label>
                <input
                  type="text"
                  placeholder="Ex.: 07:00-15:20 / 08:00-16:20"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  value={modalEmployeeEscalaTime}
                  onChange={(e) => setModalEmployeeEscalaTime(e.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Dia de folga fixo (Calendario) *</label>
                <input
                  type="date"
                  value={modalEmployeeFixedDayOffDate}
                  onChange={(e) => {
                    const v = e.target.value;
                    setModalEmployeeFixedDayOffDate(v);
                    if (!v) {
                      setModalEmployeeFixedDayOff(-1);
                      return;
                    }
                    // Usamos o dia da semana da data selecionada como folga fixa.
                    // `new Date('YYYY-MM-DD')` pode sofrer deslocamento por timezone, então fixamos hora.
                    const weekday = new Date(`${v}T12:00:00`).getDay(); // 0=Dom ... 6=Sáb
                    setModalEmployeeFixedDayOff(weekday);
                  }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <p className="text-xs text-gray-500 mt-2">
                  A data selecionada define o dia da semana da folga fixa.
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleAddEmployee}
                disabled={!modalEmployeeName.trim() || !modalEmployeeSectorId || modalEmployeeTurnos.length === 0 || !modalEmployeeEscalaTime.trim() || modalEmployeeFixedDayOff < 0}
                className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700"
              >
                <Save size={16} /> Salvar
              </button>
              <button
                type="button"
                onClick={handleCloseNewEmployeeModal}
                className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-200"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cadastrar Férias */}
      {isModalFeriasOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Cadastrar Férias</h3>
              <button
                onClick={handleCloseFeriasModal}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Data de saída *</label>
              <input
                type="date"
                value={feriasSaida}
                onChange={(e) => setFeriasSaida(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Data de volta *</label>
              <input
                type="date"
                value={feriasVolta}
                onChange={(e) => setFeriasVolta(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div className="text-xs text-gray-500">
              O sistema marcará todas as datas entre a saída e a volta como férias.
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleSaveFerias}
                disabled={!feriasSaida || !feriasVolta}
                className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700"
              >
                <Save size={16} /> Salvar
              </button>
              <button
                type="button"
                onClick={handleCloseFeriasModal}
                className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-200"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo Setor */}
      {isModalNewSectorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Novo Setor</h3>
              <button
                onClick={handleCloseNewSectorModal}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Nome do Setor *</label>
              <input
                type="text"
                placeholder="Ex.: Restaurante, Governança..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                value={newSectorName}
                onChange={(e) => setNewSectorName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Funções</label>
              <div className="space-y-2">
                {newSectorRoles.map((role, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nome da função"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                      value={role}
                      onChange={(e) => handleUpdateNewSectorRole(idx, e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveNewSectorRole(idx)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddNewSectorRole}
                  className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-xs font-bold text-gray-400 hover:border-emerald-300 hover:text-emerald-500 transition-all"
                >
                  + Adicionar Função
                </button>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleSaveNewSector}
                disabled={!newSectorName.trim()}
                className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700"
              >
                <Save size={16} /> Salvar
              </button>
              <button
                type="button"
                onClick={handleCloseNewSectorModal}
                className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-200"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCatalogs;

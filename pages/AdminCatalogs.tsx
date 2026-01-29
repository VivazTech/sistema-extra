import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Edit2, Save, X, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { useExtras } from '../context/ExtraContext';
import { RequesterItem, ReasonItem, ShiftItem, Sector } from '../types';

type ListItem = RequesterItem | ReasonItem | ShiftItem;

interface EditableListProps {
  title: string;
  items: ListItem[];
  onAdd: (item: ListItem) => Promise<ListItem | null>;
  onUpdate: (id: string, item: ListItem) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  addLabel: string;
  maxHeight?: number;
  expandable?: boolean;
}

const EditableList: React.FC<EditableListProps> = ({ title, items, onAdd, onUpdate, onDelete, addLabel, maxHeight, expandable }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleStartEdit = (item: ListItem) => {
    setEditingId(item.id);
    setEditValue(item.name);
  };

  const handleSave = async () => {
    if (!editingId) return;
    const trimmed = editValue.trim();
    if (!trimmed) return;
    await onUpdate(editingId, { id: editingId, name: trimmed });
    setEditingId(null);
    setEditValue('');
  };

  const handleAdd = async () => {
    const newId = Math.random().toString(36).substr(2, 9);
    const created = await onAdd({ id: newId, name: addLabel });
    if (created) {
      setEditingId(created.id);
      setEditValue(created.name);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue('');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold text-xs shadow-md"
        >
          <Plus size={16} /> {addLabel}
        </button>
      </div>

      <div
        className="space-y-2"
        style={expandable && !isExpanded && maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
      >
        {items.length === 0 && (
          <p className="text-xs text-gray-400 italic">Nenhum item cadastrado.</p>
        )}
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-2 border border-gray-100 rounded-lg p-2">
            {editingId === item.id ? (
              <>
                <input
                  type="text"
                  className="flex-1 border-b border-emerald-500 outline-none px-2 py-1 text-sm"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                />
                <button onClick={handleSave} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                  <Save size={16} />
                </button>
                <button onClick={handleCancel} className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg">
                  <X size={16} />
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm font-medium text-gray-700">{item.name}</span>
                <button onClick={() => handleStartEdit(item)} className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg">
                  <Edit2 size={16} />
                </button>
                <button onClick={async () => await onDelete(item.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                  <Trash2 size={16} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
      {expandable && items.length > 0 && maxHeight && (
        <div className="pt-3">
          <button
            type="button"
            onClick={() => setIsExpanded(prev => !prev)}
            className="w-full py-2 text-xs font-bold text-emerald-600 hover:text-emerald-700 border border-emerald-100 rounded-lg bg-emerald-50/60 hover:bg-emerald-100 transition-colors"
          >
            {isExpanded ? 'Ver menos' : 'Ver mais'}
          </button>
        </div>
      )}
    </div>
  );
};

const AdminCatalogs: React.FC = () => {
  const {
    sectors,
    requesters,
    reasons,
    shifts,
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
  } = useExtras();

  const [isEditingSector, setIsEditingSector] = useState<string | null>(null);
  const [editSector, setEditSector] = useState<Sector | null>(null);
  const [searchSector, setSearchSector] = useState('');
  const [expandedSectors, setExpandedSectors] = useState<Set<string>>(new Set());

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

  const handleAddSector = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newSector: Sector = { id: newId, name: 'Novo Setor', roles: ['Exemplo'] };
    addSector(newSector);
    handleStartEditSector(newSector);
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

  // Filtrar setores por pesquisa
  const filteredSectors = useMemo(() => {
    if (!searchSector.trim()) return sectors;
    const searchLower = searchSector.toLowerCase();
    return sectors.filter(sector => 
      sector.name.toLowerCase().includes(searchLower) ||
      sector.roles.some(role => role.toLowerCase().includes(searchLower))
    );
  }, [sectors, searchSector]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Cadastros do Sistema</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <EditableList
          title="Demandantes"
          items={requesters}
          onAdd={addRequester}
          onUpdate={updateRequester}
          onDelete={deleteRequester}
          addLabel="Novo Demandante"
          maxHeight={500}
          expandable
        />
        <EditableList
          title="Motivos da Solicitação"
          items={reasons}
          onAdd={addReason}
          onUpdate={updateReason}
          onDelete={deleteReason}
          addLabel="Novo Motivo"
        />
        <EditableList
          title="Turnos"
          items={shifts}
          onAdd={addShift}
          onUpdate={updateShift}
          onDelete={deleteShift}
          addLabel="Novo Turno"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Setores e Funções</h2>
          <button 
            onClick={handleAddSector}
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
    </div>
  );
};

export default AdminCatalogs;

import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { useExtras } from '../context/ExtraContext';
import { RequesterItem, ReasonItem, Sector } from '../types';

type ListItem = RequesterItem | ReasonItem;

interface EditableListProps {
  title: string;
  items: ListItem[];
  onAdd: (item: ListItem) => void;
  onUpdate: (id: string, item: ListItem) => void;
  onDelete: (id: string) => void;
  addLabel: string;
}

const EditableList: React.FC<EditableListProps> = ({ title, items, onAdd, onUpdate, onDelete, addLabel }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleStartEdit = (item: ListItem) => {
    setEditingId(item.id);
    setEditValue(item.name);
  };

  const handleSave = () => {
    if (!editingId) return;
    const trimmed = editValue.trim();
    if (!trimmed) return;
    onUpdate(editingId, { id: editingId, name: trimmed });
    setEditingId(null);
    setEditValue('');
  };

  const handleAdd = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    onAdd({ id: newId, name: addLabel });
    setEditingId(newId);
    setEditValue(addLabel);
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

      <div className="space-y-2">
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
                <button onClick={() => onDelete(item.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                  <Trash2 size={16} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminCatalogs: React.FC = () => {
  const {
    sectors,
    requesters,
    reasons,
    addSector,
    updateSector,
    deleteSector,
    addRequester,
    updateRequester,
    deleteRequester,
    addReason,
    updateReason,
    deleteReason
  } = useExtras();

  const [isEditingSector, setIsEditingSector] = useState<string | null>(null);
  const [editSector, setEditSector] = useState<Sector | null>(null);

  const handleStartEditSector = (sector: Sector) => {
    setIsEditingSector(sector.id);
    setEditSector({ ...sector });
  };

  const handleSaveSector = () => {
    if (editSector) {
      updateSector(editSector.id, editSector);
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Cadastros do Sistema</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EditableList
          title="Demandantes"
          items={requesters}
          onAdd={addRequester}
          onUpdate={updateRequester}
          onDelete={deleteRequester}
          addLabel="Novo Demandante"
        />
        <EditableList
          title="Motivos da Solicitação"
          items={reasons}
          onAdd={addReason}
          onUpdate={updateReason}
          onDelete={deleteReason}
          addLabel="Novo Motivo"
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <h2 className="text-xl font-bold text-gray-900">Setores e Funções</h2>
        <button 
          onClick={handleAddSector}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold text-sm shadow-md"
        >
          <Plus size={18} /> Novo Setor
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sectors.map(sector => (
          <div key={sector.id} className={`bg-white rounded-2xl shadow-sm border p-6 transition-all ${isEditingSector === sector.id ? 'ring-2 ring-emerald-500 border-emerald-500' : 'border-gray-100'}`}>
            {isEditingSector === sector.id ? (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nome do Setor</label>
                  <input 
                    type="text"
                    className="w-full text-lg font-bold border-b-2 border-emerald-500 outline-none p-1"
                    value={editSector?.name}
                    onChange={(e) => setEditSector({ ...editSector!, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Funções</label>
                  <div className="space-y-2">
                    {editSector?.roles.map((role, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input 
                          type="text"
                          className="flex-1 border rounded-lg px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                          value={role}
                          onChange={(e) => handleUpdateRole(idx, e.target.value)}
                        />
                        <button onClick={() => handleRemoveRole(idx)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
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
                <div className="flex gap-2 pt-4">
                  <button onClick={handleSaveSector} className="flex-1 bg-emerald-600 text-white py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                    <Save size={16} /> Salvar
                  </button>
                  <button onClick={() => setIsEditingSector(null)} className="flex-1 bg-gray-100 text-gray-500 py-2 rounded-xl text-sm font-bold">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{sector.name}</h3>
                  <div className="flex gap-1">
                    <button onClick={() => handleStartEditSector(sector)} className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"><Edit2 size={16} /></button>
                    <button onClick={() => deleteSector(sector.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-auto">
                  {sector.roles.map((role, i) => (
                    <span key={i} className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-bold uppercase">
                      {role}
                    </span>
                  ))}
                  {sector.roles.length === 0 && <p className="text-xs text-gray-400 italic">Sem funções cadastradas.</p>}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminCatalogs;

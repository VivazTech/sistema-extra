import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { useExtras } from '../context/ExtraContext';
import { RequesterItem, ReasonItem } from '../types';

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
    requesters,
    reasons,
    addRequester,
    updateRequester,
    deleteRequester,
    addReason,
    updateReason,
    deleteReason
  } = useExtras();

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
          title="Motivos da Contratação"
          items={reasons}
          onAdd={addReason}
          onUpdate={updateReason}
          onDelete={deleteReason}
          addLabel="Novo Motivo"
        />
      </div>
    </div>
  );
};

export default AdminCatalogs;


import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { useExtras } from '../context/ExtraContext';
import { Sector } from '../types';

const AdminSectors: React.FC = () => {
  const { sectors, addSector, updateSector, deleteSector } = useExtras();
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<Sector | null>(null);

  const handleStartEdit = (sector: Sector) => {
    setIsEditing(sector.id);
    setEditData({ ...sector });
  };

  const handleSave = () => {
    if (editData) {
      updateSector(editData.id, editData);
      setIsEditing(null);
      setEditData(null);
    }
  };

  const handleAdd = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newSector: Sector = { id: newId, name: 'Novo Setor', roles: ['Exemplo'] };
    addSector(newSector);
    handleStartEdit(newSector);
  };

  const handleAddRole = () => {
    if (editData) {
      setEditData({ ...editData, roles: [...editData.roles, ''] });
    }
  };

  const handleUpdateRole = (idx: number, val: string) => {
    if (editData) {
      const newRoles = [...editData.roles];
      newRoles[idx] = val;
      setEditData({ ...editData, roles: newRoles });
    }
  };

  const handleRemoveRole = (idx: number) => {
    if (editData) {
      setEditData({ ...editData, roles: editData.roles.filter((_, i) => i !== idx) });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gerenciar Setores & Funções</h1>
        <button 
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold text-sm shadow-md"
        >
          <Plus size={18} /> Novo Setor
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sectors.map(sector => (
          <div key={sector.id} className={`bg-white rounded-2xl shadow-sm border p-6 transition-all ${isEditing === sector.id ? 'ring-2 ring-emerald-500 border-emerald-500' : 'border-gray-100'}`}>
            {isEditing === sector.id ? (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nome do Setor</label>
                  <input 
                    type="text"
                    className="w-full text-lg font-bold border-b-2 border-emerald-500 outline-none p-1"
                    value={editData?.name}
                    onChange={(e) => setEditData({ ...editData!, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Funções</label>
                  <div className="space-y-2">
                    {editData?.roles.map((role, idx) => (
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
                  <button onClick={handleSave} className="flex-1 bg-emerald-600 text-white py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                    <Save size={16} /> Salvar
                  </button>
                  <button onClick={() => setIsEditing(null)} className="flex-1 bg-gray-100 text-gray-500 py-2 rounded-xl text-sm font-bold">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{sector.name}</h3>
                  <div className="flex gap-1">
                    <button onClick={() => handleStartEdit(sector)} className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"><Edit2 size={16} /></button>
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

export default AdminSectors;

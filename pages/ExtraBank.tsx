import React, { useMemo } from 'react';
import { Copy, Trash2, Users } from 'lucide-react';
import { useExtras } from '../context/ExtraContext';

const ExtraBank: React.FC = () => {
  const { extras, sectors, deleteExtra } = useExtras();
  const link = useMemo(() => `${window.location.origin}/#/banco-extras`, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      alert('Link copiado!');
    } catch {
      alert(`Link: ${link}`);
    }
  };

  const grouped = useMemo(() => {
    return sectors.map(sector => ({
      sector: sector.name,
      extras: extras.filter(e => e.sector === sector.name)
    })).filter(g => g.extras.length > 0);
  }, [extras, sectors]);

  return (
    <div className="space-y-6">
      <header className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h1 className="text-2xl font-bold text-gray-900">Banco de Extras</h1>
        <p className="text-gray-500 mt-1">Compartilhe o link abaixo com os extras para cadastro.</p>
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <input
            readOnly
            value={link}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600"
          />
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold text-sm"
          >
            <Copy size={16} /> Copiar link
          </button>
        </div>
      </header>

      {extras.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center text-gray-400">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          Nenhum extra cadastrado ainda.
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(group => (
            <div key={group.sector} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-emerald-900 mb-4">{group.sector}</h2>
              <div className="space-y-2">
                {group.extras.map(extra => (
                  <div key={extra.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{extra.fullName}</p>
                      <p className="text-xs text-gray-500">{extra.contact} • {extra.cpf}</p>
                    </div>
                    <button
                      onClick={() => deleteExtra(extra.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      title="Remover"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExtraBank;

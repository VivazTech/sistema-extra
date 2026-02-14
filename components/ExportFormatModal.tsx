import React from 'react';
import { FileText, FileSpreadsheet, X } from 'lucide-react';

export type ExportFormat = 'pdf' | 'excel';

/** Filtro VIVAZ/AQUAMANIA para exportação de listagem e recibos em massa. */
export const SECTOR_FILTER_OPTIONS = [
  { value: 'VIVAZ', label: 'VIVAZ (todos exceto Aquamania)' },
  { value: 'AQUAMANIA', label: 'AQUAMANIA (apenas Aquamania)' },
] as const;

interface ExportFormatModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Para type 'bulk' e 'list' recebe (format, sectorFilter?) onde sectorFilter é 'VIVAZ' ou 'AQUAMANIA'. */
  onExport: (format: ExportFormat, sector?: string) => void;
  type: 'recibo' | 'list' | 'bulk';
  /** Ignorado para type 'list' e 'bulk' (usa filtro VIVAZ/AQUAMANIA). */
  sectors?: string[];
}

const LABELS = {
  recibo: {
    title: 'Baixar Recibo de Pagamento',
    pdf: 'PDF',
    excel: 'Excel (.xlsx)',
  },
  list: {
    title: 'Baixar Listagem de Solicitações',
    pdf: 'PDF',
    excel: 'Excel (.xlsx)',
  },
  bulk: {
    title: 'Baixar Recibos de Pagamento',
    pdf: 'PDF',
    excel: 'Excel (.xlsx)',
  },
};

const ExportFormatModal: React.FC<ExportFormatModalProps> = ({ isOpen, onClose, onExport, type }) => {
  const [selected, setSelected] = React.useState<ExportFormat | null>(null);
  const [selectedSector, setSelectedSector] = React.useState<string>('VIVAZ');
  const labels = LABELS[type];
  const showSectorSelector = type === 'bulk' || type === 'list';

  React.useEffect(() => {
    if (isOpen && showSectorSelector) setSelectedSector('VIVAZ');
  }, [isOpen, showSectorSelector]);

  const handleDownload = () => {
    if (selected) {
      onExport(selected, showSectorSelector && selectedSector ? selectedSector : undefined);
      setSelected(null);
      setSelectedSector('');
      onClose();
    }
  };

  const handleClose = () => {
    setSelected(null);
    setSelectedSector('VIVAZ');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">{labels.title}</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {showSectorSelector && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filtro</label>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-gray-900"
            >
              {SECTOR_FILTER_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {type === 'bulk' ? 'VIVAZ: todos exceto Aquamania. AQUAMANIA: apenas setor Aquamania.' : 'VIVAZ: todos exceto Aquamania. AQUAMANIA: apenas setor Aquamania.'}
            </p>
          </div>
        )}

        <p className="text-sm text-gray-600 mb-4">Selecione o formato desejado:</p>

        <div className="space-y-2 mb-6">
          <button
            type="button"
            onClick={() => setSelected('pdf')}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
              selected === 'pdf'
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <FileText size={28} className={selected === 'pdf' ? 'text-emerald-600' : 'text-gray-500'} />
            <span className="font-semibold">{labels.pdf}</span>
          </button>
          <button
            type="button"
            onClick={() => setSelected('excel')}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
              selected === 'excel'
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <FileSpreadsheet size={28} className={selected === 'excel' ? 'text-emerald-600' : 'text-gray-500'} />
            <span className="font-semibold">{labels.excel}</span>
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 py-3 font-bold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleDownload}
            disabled={!selected}
            className="flex-1 py-3 font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Baixar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportFormatModal;

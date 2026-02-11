import React, { useState, useEffect, useRef } from 'react';
import { FileText, RefreshCw } from 'lucide-react';
import { useExtras } from '../context/ExtraContext';
import { getIndividualPDFBlobUrl, getListPDFBlobUrl } from '../services/pdfService';
import { ExtraRequest } from '../types';

/**
 * Página provisória para visualizar os PDFs conforme você edita o pdfService.
 * Acesse via /#/preview-pdf (ou /preview-pdf no HashRouter).
 */
const PDFPreview: React.FC = () => {
  const { requests } = useExtras();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<'individual' | 'list'>('individual');
  const [selectedRequestId, setSelectedRequestId] = useState<string>('');
  const [listTitle, setListTitle] = useState('Solicitações - Preview');
  const prevUrlRef = useRef<string | null>(null);

  const updatePreview = () => {
    if (prevUrlRef.current) {
      URL.revokeObjectURL(prevUrlRef.current);
      prevUrlRef.current = null;
    }
    setPdfUrl(null);

    if (mode === 'list') {
      const list = requests.length ? requests : [];
      const url = getListPDFBlobUrl(list, listTitle);
      prevUrlRef.current = url;
      setPdfUrl(url);
      return;
    }

    const req = requests.find(r => r.id === selectedRequestId);
    if (!req) {
      if (requests.length > 0) {
        const first = requests[0];
        setSelectedRequestId(first.id);
        const url = getIndividualPDFBlobUrl(first);
        prevUrlRef.current = url;
        setPdfUrl(url);
      }
      return;
    }
    const url = getIndividualPDFBlobUrl(req);
    prevUrlRef.current = url;
    setPdfUrl(url);
  };

  useEffect(() => {
    return () => {
      if (prevUrlRef.current) {
        URL.revokeObjectURL(prevUrlRef.current);
        prevUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (requests.length > 0 && !selectedRequestId) {
      setSelectedRequestId(requests[0].id);
    }
  }, [requests, selectedRequestId]);

  // Auto-atualiza o preview do PDF quando os dados da solicitação mudam (ex: portaria registrou horários)
  useEffect(() => {
    if (mode === 'individual' && selectedRequestId && requests.length > 0) {
      updatePreview();
    } else if (mode === 'list' && requests.length > 0) {
      updatePreview();
    }
  }, [requests, selectedRequestId, mode]);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-gray-800">
            <FileText size={24} className="text-emerald-600" />
            <h1 className="text-lg font-bold">Preview de PDF (provisório)</h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Tipo:</span>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as 'individual' | 'list')}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="individual">Solicitação individual</option>
                <option value="list">Listagem</option>
              </select>
            </label>

            {mode === 'individual' && (
              <label className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Solicitação:</span>
                <select
                  value={selectedRequestId}
                  onChange={(e) => setSelectedRequestId(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[200px]"
                >
                  {requests.length === 0 && (
                    <option value="">Nenhuma solicitação</option>
                  )}
                  {requests.map((r: ExtraRequest) => (
                    <option key={r.id} value={r.id}>
                      {r.code} – {r.extraName}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {mode === 'list' && (
              <label className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Título:</span>
                <input
                  type="text"
                  value={listTitle}
                  onChange={(e) => setListTitle(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-48"
                  placeholder="Título da listagem"
                />
              </label>
            )}

            <button
              type="button"
              onClick={updatePreview}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium text-sm hover:bg-emerald-700 transition-colors"
            >
              <RefreshCw size={18} />
              Atualizar preview
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden" style={{ minHeight: '80vh' }}>
          {pdfUrl ? (
            <iframe
              title="Preview PDF"
              src={pdfUrl}
              className="w-full border-0"
              style={{ height: '85vh' }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-gray-500">
              <FileText size={48} className="mb-4 opacity-50" />
              <p className="text-sm font-medium">Selecione uma solicitação ou listagem e clique em &quot;Atualizar preview&quot;</p>
              {requests.length === 0 && (
                <p className="text-xs mt-2">Não há solicitações carregadas. Acesse Solicitações antes.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PDFPreview;

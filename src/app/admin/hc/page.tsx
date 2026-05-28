'use client';
import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Lock, Upload, CheckCircle2, XCircle,
  AlertCircle, FileSpreadsheet, RefreshCw, ChevronDown,
} from 'lucide-react';

interface ImportResult {
  ok: boolean;
  sheet: string;
  sheets: string[];
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
  detectedColumns: Record<string, string | null>;
  error?: string;
}

export default function AdminHCPage() {
  const [password, setPassword] = useState('');
  const [file, setFile]         = useState<File | null>(null);
  const [sheet, setSheet]       = useState('');
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<ImportResult | null>(null);
  const [authError, setAuthError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setResult(null);
    setSheet('');
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) { setAuthError('Informe a senha.'); return; }
    if (!file)     { return; }
    setAuthError('');
    setLoading(true);
    setResult(null);

    const fd = new FormData();
    fd.append('password', password);
    fd.append('file', file);
    if (sheet) fd.append('sheet', sheet);

    try {
      const res = await fetch('/api/admin/hc', { method: 'POST', body: fd });
      const data: ImportResult = await res.json();
      if (res.status === 401) { setAuthError('Senha incorreta.'); setLoading(false); return; }
      setResult(data);
    } catch {
      setResult({ ok: false, error: 'Erro de rede ao enviar o arquivo.', sheet: '', sheets: [], inserted: 0, updated: 0, skipped: 0, errors: [], detectedColumns: {} });
    }
    setLoading(false);
  }

  const inp = 'w-full border border-red-100 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300';

  return (
    <div className="max-w-2xl space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={18} /></Link>
        <div>
          <h2 className="font-display text-xl font-bold text-brand-800">Atualizar Base de HC</h2>
          <p className="text-sm text-brand-muted">Importação da planilha Detalhe15 — Diretoria Industrial</p>
        </div>
      </div>

      {/* Password banner */}
      <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3 text-sm text-yellow-800">
        <Lock size={15} className="shrink-0 text-yellow-600" />
        Acesso restrito — informe a senha de importação antes de enviar o arquivo.
      </div>

      <form onSubmit={submit} className="space-y-5">

        {/* Password */}
        <div className="bg-white rounded-2xl border border-red-100 p-5 shadow-card space-y-4">
          <h3 className="font-display font-bold text-brand-800 text-sm border-b border-red-50 pb-3">
            Autenticação
          </h3>
          <div>
            <label className="block text-xs font-semibold text-brand-muted uppercase tracking-wide mb-1">
              Senha de importação
            </label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setAuthError(''); }}
              placeholder="••••••••"
              className={inp}
              autoComplete="current-password"
            />
            {authError && (
              <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                <XCircle size={12} /> {authError}
              </p>
            )}
          </div>
        </div>

        {/* File upload */}
        <div className="bg-white rounded-2xl border border-red-100 p-5 shadow-card space-y-4">
          <h3 className="font-display font-bold text-brand-800 text-sm border-b border-red-50 pb-3">
            Arquivo Excel
          </h3>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={[
              'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors',
              dragging ? 'border-brand-400 bg-brand-50' : 'border-red-200 hover:border-brand-300 hover:bg-brand-50/50',
            ].join(' ')}
          >
            <input
              ref={fileRef} type="file"
              accept=".xlsx,.xls,.xlsm"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <FileSpreadsheet size={32} className="text-green-600" />
                <p className="font-semibold text-gray-800 text-sm">{file.name}</p>
                <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} KB — clique para trocar</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <Upload size={28} />
                <p className="text-sm font-medium">Arraste o arquivo aqui ou clique para selecionar</p>
                <p className="text-xs">Suporta .xlsx, .xls, .xlsm (Detalhe15-Diretoria Industrial)</p>
              </div>
            )}
          </div>

          {/* Sheet selector — shown after a failed import that returned sheet list */}
          {result?.sheets && result.sheets.length > 0 && (
            <div className="relative">
              <label className="block text-xs font-semibold text-brand-muted uppercase tracking-wide mb-1">
                Aba da planilha
              </label>
              <select
                value={sheet}
                onChange={e => setSheet(e.target.value)}
                className={inp + ' appearance-none'}
              >
                <option value="">Auto-detectar "HC maio"</option>
                {result.sheets.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 bottom-3 text-gray-400 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !file}
          className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600 text-white rounded-xl font-semibold text-sm hover:bg-brand-700 transition-colors disabled:opacity-50 shadow-sm"
        >
          {loading
            ? <><RefreshCw size={16} className="animate-spin" /> Importando...</>
            : <><Upload size={16} /> Importar Colaboradores</>
          }
        </button>
      </form>

      {/* Results */}
      {result && (
        <div className={`rounded-2xl border p-5 space-y-4 ${result.ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>

          {result.ok ? (
            <>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-green-600 shrink-0" />
                <p className="font-semibold text-green-800">Importação concluída — aba "{result.sheet}"</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Inseridos', value: result.inserted, color: 'bg-green-100 text-green-800' },
                  { label: 'Atualizados', value: result.updated, color: 'bg-blue-100 text-blue-800' },
                  { label: 'Ignorados', value: result.skipped, color: 'bg-gray-100 text-gray-600' },
                ].map(({ label, value, color }) => (
                  <div key={label} className={`${color} rounded-xl p-3 text-center`}>
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-xs font-semibold uppercase tracking-wide mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Column mapping */}
              <div className="bg-white/60 rounded-xl p-3 text-xs space-y-1">
                <p className="font-semibold text-gray-600 mb-1.5">Colunas detectadas:</p>
                {Object.entries(result.detectedColumns).map(([key, col]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-gray-500 capitalize">{key}</span>
                    <span className={col ? 'text-green-700 font-medium' : 'text-red-400'}>
                      {col ?? '— não encontrada'}
                    </span>
                  </div>
                ))}
              </div>

              {result.errors.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                  <p className="text-xs font-semibold text-yellow-800 mb-1">
                    {result.errors.length} linha(s) com erro:
                  </p>
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-xs text-yellow-700">{e}</p>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-start gap-2">
              <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800">Erro na importação</p>
                <p className="text-sm text-red-700 mt-0.5">{result.error}</p>
                {result.sheets?.length > 0 && (
                  <p className="text-xs text-red-600 mt-2">
                    Abas disponíveis: {result.sheets.join(', ')} — selecione a aba correta acima e tente novamente.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

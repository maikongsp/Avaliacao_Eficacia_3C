'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Search, Edit2, Trash2, Link2, Lock,
  X, Save, RefreshCw, ChevronDown, CheckCircle2, AlertCircle,
} from 'lucide-react';

interface QuestionTraining { id: number; name: string; sort_order: number }
interface Question { id: number; text: string; type: string; trainings: QuestionTraining[] }
interface Training { id: number; name: string; category: string }

const QUESTION_TYPES = [
  { value: 'tecnica',               label: 'Técnica (específica)' },
  { value: 'safety_general',        label: 'Segurança Geral' },
  { value: 'safety_nr11',           label: 'Segurança NR 11 (Movimentação)' },
  { value: 'safety_nr12',           label: 'Segurança NR 12 (Máquinas)' },
  { value: 'safety_lockout',        label: 'Bloqueio de Energias' },
  { value: 'height_confined_check', label: 'Verificação Altura / Confinado' },
  { value: 'height_exec',           label: 'Trabalho em Altura' },
  { value: 'confined_exec',         label: 'Espaço Confinado' },
];

const TYPE_LABEL: Record<string, string> = Object.fromEntries(QUESTION_TYPES.map(t => [t.value, t.label]));

const TYPE_STYLE: Record<string, string> = {
  tecnica:               'bg-blue-50 text-blue-700 border-blue-200',
  safety_general:        'bg-orange-50 text-orange-700 border-orange-200',
  safety_nr11:           'bg-yellow-50 text-yellow-700 border-yellow-200',
  safety_nr12:           'bg-amber-50 text-amber-700 border-amber-200',
  safety_lockout:        'bg-red-100 text-red-700 border-red-200',
  height_confined_check: 'bg-purple-50 text-purple-700 border-purple-200',
  height_exec:           'bg-violet-50 text-violet-700 border-violet-200',
  confined_exec:         'bg-green-50 text-green-700 border-green-200',
};

const inp = 'w-full border border-red-100 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300';
const labelCls = 'block text-xs font-semibold text-brand-muted uppercase tracking-wide mb-1';

export default function AdminPerguntasPage() {
  const [questions, setQuestions]   = useState<Question[]>([]);
  const [trainings, setTrainings]   = useState<Training[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [mounted, setMounted]       = useState(false);

  // Create modal
  const [createOpen, setCreateOpen]     = useState(false);
  const [createText, setCreateText]     = useState('');
  const [createType, setCreateType]     = useState('safety_general');
  const [createPwd, setCreatePwd]       = useState('');
  const [createErr, setCreateErr]       = useState('');
  const [creating, setCreating]         = useState(false);

  // Edit modal
  const [editQ, setEditQ]         = useState<Question | null>(null);
  const [editText, setEditText]   = useState('');
  const [editType, setEditType]   = useState('');
  const [editPwd, setEditPwd]     = useState('');
  const [editErr, setEditErr]     = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Delete modal
  const [deleteQ, setDeleteQ]         = useState<{ id: number; text: string; error: string } | null>(null);
  const [deletePwd, setDeletePwd]     = useState('');
  const [deleting, setDeleting]       = useState(false);

  // Links modal
  const [linksQ, setLinksQ]             = useState<Question | null>(null);
  const [linksPwd, setLinksPwd]         = useState('');
  const [linkTid, setLinkTid]           = useState('');
  const [linkOrder, setLinkOrder]       = useState('1');
  const [linksErr, setLinksErr]         = useState('');
  const [linksWorking, setLinksWorking] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    load();
    fetch('/api/treinamentos').then(r => r.json()).then(setTrainings);
  }, []);

  async function load() {
    setLoading(true);
    const data: Question[] = await fetch('/api/admin/perguntas').then(r => r.json());
    setQuestions(data);
    setLoading(false);
  }

  async function reloadAndUpdateLinksModal(qId: number) {
    const data: Question[] = await fetch('/api/admin/perguntas').then(r => r.json());
    setQuestions(data);
    const updated = data.find(q => q.id === qId);
    if (updated) setLinksQ(updated);
  }

  const filtered = questions.filter(q => {
    const matchSearch = !search ||
      q.text.toLowerCase().includes(search.toLowerCase()) ||
      (TYPE_LABEL[q.type] ?? q.type).toLowerCase().includes(search.toLowerCase());
    const matchType = !typeFilter || q.type === typeFilter;
    return matchSearch && matchType;
  });

  // ── Create ──────────────────────────────────────────────────────────────────
  async function createQuestion() {
    if (!createText.trim()) { setCreateErr('O texto da questão é obrigatório.'); return; }
    if (!createPwd)         { setCreateErr('Informe a senha de administrador.'); return; }
    setCreating(true); setCreateErr('');
    const res = await fetch('/api/admin/perguntas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: createText, type: createType, password: createPwd }),
    });
    const data = await res.json();
    if (!res.ok) { setCreateErr(data.error || 'Erro ao criar questão'); setCreating(false); return; }
    setCreateOpen(false); setCreateText(''); setCreateType('safety_general'); setCreatePwd('');
    setCreating(false); load();
  }

  // ── Edit ────────────────────────────────────────────────────────────────────
  function openEdit(q: Question) {
    setEditQ(q); setEditText(q.text); setEditType(q.type); setEditPwd(''); setEditErr('');
  }

  async function saveEdit() {
    if (!editText.trim()) { setEditErr('O texto é obrigatório.'); return; }
    if (!editPwd)         { setEditErr('Informe a senha de administrador.'); return; }
    setEditSaving(true); setEditErr('');
    const res = await fetch(`/api/admin/perguntas/${editQ!.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: editText, type: editType, password: editPwd }),
    });
    const data = await res.json();
    if (!res.ok) { setEditErr(data.error || 'Erro ao salvar'); setEditSaving(false); return; }
    setEditQ(null); setEditSaving(false); load();
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  async function confirmDelete() {
    if (!deletePwd) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/perguntas/${deleteQ!.id}`, {
      method: 'DELETE',
      headers: { 'x-admin-password': deletePwd },
    });
    const data = await res.json();
    if (!res.ok) { setDeleteQ({ ...deleteQ!, error: data.error || 'Erro ao excluir' }); setDeleting(false); return; }
    setDeleteQ(null); setDeletePwd(''); setDeleting(false); load();
  }

  // ── Links ───────────────────────────────────────────────────────────────────
  function openLinks(q: Question) {
    setLinksQ(q); setLinksPwd(''); setLinkTid(''); setLinkOrder('1'); setLinksErr('');
  }

  async function linkTraining() {
    if (!linksPwd)  { setLinksErr('Informe a senha de administrador.'); return; }
    if (!linkTid)   { setLinksErr('Selecione um treinamento.'); return; }
    setLinksWorking(true); setLinksErr('');
    const res = await fetch(`/api/admin/perguntas/${linksQ!.id}/treinamentos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: linksPwd, training_id: Number(linkTid), sort_order: Number(linkOrder) }),
    });
    const data = await res.json();
    if (!res.ok) { setLinksErr(data.error || 'Erro ao vincular'); setLinksWorking(false); return; }
    setLinkTid(''); setLinksWorking(false);
    reloadAndUpdateLinksModal(linksQ!.id);
  }

  async function unlinkTraining(tid: number) {
    if (!linksPwd) { setLinksErr('Informe a senha antes de desvincular.'); return; }
    setLinksWorking(true); setLinksErr('');
    const res = await fetch(`/api/admin/perguntas/${linksQ!.id}/treinamentos/${tid}`, {
      method: 'DELETE',
      headers: { 'x-admin-password': linksPwd },
    });
    const data = await res.json();
    if (!res.ok) { setLinksErr(data.error || 'Erro ao desvincular'); setLinksWorking(false); return; }
    setLinksWorking(false);
    reloadAndUpdateLinksModal(linksQ!.id);
  }

  const availableTrainings = trainings.filter(t => !linksQ?.trainings.some(lt => lt.id === t.id));

  const typeOptions = Array.from(new Set(questions.map(q => q.type))).sort();

  return (
    <div className="max-w-5xl space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Link href="/" className="text-gray-400 hover:text-gray-600"><ArrowLeft size={18} /></Link>
        <div className="flex-1">
          <h2 className="font-display text-xl font-bold text-brand-800">Questões das Avaliações</h2>
          <p className="text-sm text-brand-muted">Gerencie o banco de questões e os vínculos com treinamentos</p>
        </div>
        <button
          onClick={() => { setCreateOpen(true); setCreateErr(''); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm"
        >
          <Plus size={16} /> Nova Questão
        </button>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',            value: questions.length,                                        color: 'border-red-100 text-brand-600' },
          { label: 'Tipos distintos',  value: new Set(questions.map(q => q.type)).size,                color: 'border-blue-100 text-blue-700' },
          { label: 'Com vínculos',     value: questions.filter(q => q.trainings.length > 0).length,    color: 'border-green-100 text-green-700' },
          { label: 'Sem vínculos',     value: questions.filter(q => q.trainings.length === 0).length,  color: 'border-yellow-100 text-yellow-700' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`bg-white rounded-2xl border p-4 shadow-card ${color}`}>
            <p className="text-2xl font-bold text-brand-dark">{value}</p>
            <p className="text-[11px] text-brand-muted font-medium uppercase tracking-wide mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="bg-white rounded-2xl border border-red-100 p-4 shadow-card">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por texto ou tipo..."
              className="w-full border border-red-100 rounded-xl pl-8 pr-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>
          <div className="relative">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="w-full border border-red-100 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 appearance-none"
            >
              <option value="">Todos os tipos</option>
              {typeOptions.map(t => (
                <option key={t} value={t}>{TYPE_LABEL[t] ?? t}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ── Question list ── */}
      <div className="bg-white rounded-2xl border border-red-100 overflow-hidden shadow-card">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-400">Nenhuma questão encontrada.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-brand-50 border-b border-red-100">
                <tr>
                  {['#', 'Tipo', 'Texto da Questão', 'Treinamentos', ''].map(h => (
                    <th key={h} className="text-left text-brand-muted font-semibold text-[11px] uppercase tracking-wide px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(q => (
                  <tr key={q.id} className="border-b border-red-50 hover:bg-brand-50/40 transition-colors">
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs w-10">{q.id}</td>
                    <td className="px-4 py-3 w-36">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${TYPE_STYLE[q.type] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {TYPE_LABEL[q.type] ?? q.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-sm text-gray-700 line-clamp-2">{q.text}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {q.trainings.length === 0 ? (
                        <span className="text-xs text-yellow-600 font-medium">Sem vínculo</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-green-700 font-semibold">
                          <CheckCircle2 size={12} /> {q.trainings.length} treinamento{q.trainings.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => openEdit(q)}
                          className="text-[11px] text-brand-600 hover:text-brand-800 border border-brand-200 rounded-lg px-2.5 py-1 hover:bg-brand-50 transition-colors flex items-center gap-1"
                        >
                          <Edit2 size={11} /> Editar
                        </button>
                        <button
                          onClick={() => openLinks(q)}
                          className="text-[11px] text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-2.5 py-1 hover:bg-blue-50 transition-colors flex items-center gap-1"
                        >
                          <Link2 size={11} /> Vínculos
                        </button>
                        <button
                          onClick={() => { setDeleteQ({ id: q.id, text: q.text, error: '' }); setDeletePwd(''); }}
                          className="text-[11px] text-red-400 hover:text-red-600 border border-red-100 rounded-lg px-2.5 py-1 hover:bg-red-50 transition-colors flex items-center gap-1"
                        >
                          <Trash2 size={11} /> Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MODALS (via createPortal — bypass AppShell overflow/stacking context)
         ══════════════════════════════════════════════════════════════════════ */}

      {mounted && createPortal(
        <>
          {/* ── Create modal ── */}
          {createOpen && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] p-4">
              <div className="bg-white rounded-2xl shadow-xl p-6 max-w-lg w-full space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-brand-800 text-lg">Nova Questão</h3>
                  <button onClick={() => setCreateOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                    <X size={18} />
                  </button>
                </div>

                <div>
                  <label className={labelCls}>Tipo da Questão</label>
                  <div className="relative">
                    <select value={createType} onChange={e => setCreateType(e.target.value)} className={inp + ' appearance-none'}>
                      {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Texto da Questão <span className="text-red-500">*</span></label>
                  <textarea
                    value={createText}
                    onChange={e => setCreateText(e.target.value)}
                    rows={4}
                    className={inp}
                    placeholder="Digite o enunciado completo da questão..."
                    autoFocus
                  />
                </div>

                <div>
                  <label className={labelCls}><Lock size={11} className="inline mr-1" />Senha de Administrador</label>
                  <input
                    type="password"
                    value={createPwd}
                    onChange={e => setCreatePwd(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && createQuestion()}
                    placeholder="••••••••"
                    className={inp}
                  />
                </div>

                {createErr && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-center gap-2">
                    <AlertCircle size={14} /> {createErr}
                  </p>
                )}

                <div className="flex gap-2 justify-end pt-1">
                  <button
                    onClick={() => { setCreateOpen(false); setCreateErr(''); }}
                    className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50"
                  >Cancelar</button>
                  <button
                    onClick={createQuestion}
                    disabled={creating}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 disabled:opacity-60 transition-colors"
                  >
                    {creating ? <><RefreshCw size={14} className="animate-spin" /> Criando...</> : <><Save size={14} /> Criar Questão</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Edit modal ── */}
          {editQ && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] p-4">
              <div className="bg-white rounded-2xl shadow-xl p-6 max-w-lg w-full space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-brand-800 text-lg">Editar Questão #{editQ.id}</h3>
                  <button onClick={() => setEditQ(null)} className="text-gray-400 hover:text-gray-600 p-1">
                    <X size={18} />
                  </button>
                </div>

                <div>
                  <label className={labelCls}>Tipo da Questão</label>
                  <div className="relative">
                    <select value={editType} onChange={e => setEditType(e.target.value)} className={inp + ' appearance-none'}>
                      {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      {!QUESTION_TYPES.find(t => t.value === editType) && (
                        <option value={editType}>{editType}</option>
                      )}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Texto da Questão <span className="text-red-500">*</span></label>
                  <textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    rows={4}
                    className={inp}
                    autoFocus
                  />
                </div>

                <div>
                  <label className={labelCls}><Lock size={11} className="inline mr-1" />Senha de Administrador</label>
                  <input
                    type="password"
                    value={editPwd}
                    onChange={e => setEditPwd(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveEdit()}
                    placeholder="••••••••"
                    className={inp}
                  />
                </div>

                {editErr && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-center gap-2">
                    <AlertCircle size={14} /> {editErr}
                  </p>
                )}

                <div className="flex gap-2 justify-end pt-1">
                  <button onClick={() => setEditQ(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
                    Cancelar
                  </button>
                  <button
                    onClick={saveEdit}
                    disabled={editSaving}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 disabled:opacity-60 transition-colors"
                  >
                    {editSaving ? <><RefreshCw size={14} className="animate-spin" /> Salvando...</> : <><Save size={14} /> Salvar</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Delete modal ── */}
          {deleteQ && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] p-4">
              <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                    <Trash2 size={18} className="text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Excluir Questão #{deleteQ.id}</h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{deleteQ.text}</p>
                    <p className="text-xs text-gray-500 mt-2">Esta ação não pode ser desfeita. Questões com respostas em avaliações não podem ser excluídas.</p>
                  </div>
                </div>
                <input
                  type="password"
                  value={deletePwd}
                  onChange={e => setDeletePwd(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && confirmDelete()}
                  placeholder="Senha de administrador"
                  autoFocus
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                />
                {deleteQ.error && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-1.5 flex items-start gap-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" /> {deleteQ.error}
                  </p>
                )}
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => { setDeleteQ(null); setDeletePwd(''); }}
                    className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50"
                  >Cancelar</button>
                  <button
                    onClick={confirmDelete}
                    disabled={deleting || !deletePwd}
                    className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-60 transition-colors"
                  >
                    {deleting ? 'Excluindo...' : 'Confirmar Exclusão'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Links modal ── */}
          {linksQ && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] p-4">
              <div className="bg-white rounded-2xl shadow-xl p-6 max-w-xl w-full space-y-4 max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display font-bold text-brand-800 text-lg">Vínculos — Questão #{linksQ.id}</h3>
                    <p className="text-xs text-brand-muted mt-0.5 line-clamp-1">{linksQ.text}</p>
                  </div>
                  <button onClick={() => setLinksQ(null)} className="text-gray-400 hover:text-gray-600 p-1 shrink-0">
                    <X size={18} />
                  </button>
                </div>

                {/* Password (shared for all operations in this modal) */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                  <label className="block text-xs font-semibold text-yellow-800 mb-1.5">
                    <Lock size={11} className="inline mr-1" /> Senha de Administrador (necessária para vincular/desvincular)
                  </label>
                  <input
                    type="password"
                    value={linksPwd}
                    onChange={e => setLinksPwd(e.target.value)}
                    placeholder="••••••••"
                    className="w-full border border-yellow-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-300"
                  />
                </div>

                {/* Current links */}
                <div>
                  <p className={labelCls}>Treinamentos vinculados ({linksQ.trainings.length})</p>
                  {linksQ.trainings.length === 0 ? (
                    <p className="text-xs text-yellow-600 bg-yellow-50 rounded-xl px-3 py-2 border border-yellow-100">
                      Nenhum treinamento vinculado ainda.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {linksQ.trainings
                        .sort((a, b) => a.sort_order - b.sort_order)
                        .map(t => (
                          <div key={t.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                            <span className="text-[10px] text-gray-400 font-mono w-6 text-center bg-white rounded border border-gray-200 py-0.5">{t.sort_order}</span>
                            <p className="text-xs text-gray-700 flex-1 truncate" title={t.name}>{t.name}</p>
                            <button
                              onClick={() => unlinkTraining(t.id)}
                              disabled={linksWorking}
                              className="text-[11px] text-red-500 hover:text-red-700 border border-red-200 rounded-lg px-2 py-0.5 hover:bg-red-50 transition-colors disabled:opacity-50 shrink-0"
                            >
                              Desvincular
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Add link */}
                {availableTrainings.length > 0 && (
                  <div className="border-t border-red-50 pt-4 space-y-3">
                    <p className={labelCls}>Vincular a um novo treinamento</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2 relative">
                        <select
                          value={linkTid}
                          onChange={e => setLinkTid(e.target.value)}
                          className={inp + ' appearance-none'}
                        >
                          <option value="">Selecione o treinamento...</option>
                          {availableTrainings.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                        <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                      <div>
                        <input
                          type="number"
                          value={linkOrder}
                          onChange={e => setLinkOrder(e.target.value)}
                          min={1} max={99}
                          className={inp}
                          placeholder="Ordem"
                          title="Ordem de exibição (sort_order)"
                        />
                      </div>
                    </div>
                    <button
                      onClick={linkTraining}
                      disabled={linksWorking || !linkTid}
                      className="w-full flex items-center justify-center gap-2 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {linksWorking ? <><RefreshCw size={14} className="animate-spin" /> Vinculando...</> : <><Link2 size={14} /> Vincular Treinamento</>}
                    </button>
                  </div>
                )}

                {linksErr && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-center gap-2">
                    <AlertCircle size={14} /> {linksErr}
                  </p>
                )}

                <div className="flex justify-end pt-1">
                  <button onClick={() => setLinksQ(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          )}
        </>,
        document.body
      )}
    </div>
  );
}

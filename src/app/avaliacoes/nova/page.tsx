'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
import { Plus, Trash2, Search, ChevronDown, ChevronUp, CheckCircle, XCircle, MinusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type SkillLevel } from '@/lib/ranges';


type Answer = 'CONFORME' | 'NAO_CONFORME' | 'NA';

interface Question {
  id: number;
  text: string;
  type: string;
}

interface Employee {
  id: number;
  name: string;
  registration: string;
  position: string;
  unit_name: string;
}

interface Training {
  id: number;
  name: string;
  category: string;
  has_height: number;
  has_confined: number;
}

interface Unit {
  id: number;
  name: string;
}

interface CollaboratorEntry {
  employee?: Employee;
  employee_name: string;
  desired_level: SkillLevel;
  is_effective: boolean;
  ineffective_reason: string;
  has_height_work: boolean;
  has_confined_work: boolean;
  answers: Record<number, Answer>;
  expanded: boolean;
}

function AnswerBtn({ value, current, onChange, label, icon: Icon, color }: {
  value: Answer; current: Answer; onChange: (v: Answer) => void;
  label: string; icon: React.ElementType; color: string;
}) {
  const selected = current === value;
  const colors: Record<string, string> = {
    green: selected ? 'bg-green-600 text-white border-green-600' : 'border-green-200 text-green-600 hover:bg-green-50',
    red: selected ? 'bg-red-600 text-white border-red-600' : 'border-red-200 text-red-600 hover:bg-red-50',
    gray: selected ? 'bg-gray-500 text-white border-gray-500' : 'border-gray-200 text-gray-500 hover:bg-gray-50',
  };
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all', colors[color])}
    >
      <Icon size={13} />
      {label}
    </button>
  );
}

function NovaAvaliacaoPageContent() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1 data
  const [evaluatorEmail, setEvaluatorEmail] = useState('');
  const [evaluatorName, setEvaluatorName] = useState('');
  const [evaluationDate, setEvaluationDate] = useState(new Date().toISOString().slice(0, 10));
  const [trainingDate, setTrainingDate] = useState('');
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  const [trainings, setTrainings] = useState<Training[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [collaborators, setCollaborators] = useState<CollaboratorEntry[]>([]);

  // Employee search
  const [empSearch, setEmpSearch] = useState('');
  const [empResults, setEmpResults] = useState<Employee[]>([]);
  const [showEmpSearch, setShowEmpSearch] = useState(false);

  useEffect(() => {
    fetch('/api/treinamentos').then(r => r.json()).then(setTrainings);
    fetch('/api/colaboradores').then(r => r.json()).then((emps: Employee[]) => {
      const uniqueUnits = Array.from(new Set(emps.map(e => e.unit_name)))
        .filter(Boolean)
        .map((name, i) => ({ id: i + 1, name }));
      setUnits(uniqueUnits);
    });
    // Actually fetch units from employees API
    fetch('/api/colaboradores?q=').then(r => r.json()).then((emps: Employee[]) => {
      const seen = new Map<string, Unit>();
      emps.forEach(e => {
        if (e.unit_name && !seen.has(e.unit_name)) {
          seen.set(e.unit_name, { id: seen.size + 1, name: e.unit_name });
        }
      });
      setUnits(Array.from(seen.values()));
    });
  }, []);

  const searchEmployees = useCallback(async (q: string) => {
    if (q.length < 2) { setEmpResults([]); return; }
    const res = await fetch(`/api/colaboradores?q=${encodeURIComponent(q)}`);
    setEmpResults(await res.json());
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchEmployees(empSearch), 300);
    return () => clearTimeout(t);
  }, [empSearch, searchEmployees]);

  const loadQuestions = async (tid: number) => {
    const res = await fetch(`/api/perguntas?training_id=${tid}`);
    const qs: Question[] = await res.json();
    setQuestions(qs);
    // Reset collaborator answers
    setCollaborators(prev => prev.map(c => ({ ...c, answers: {} })));
  };

  const handleTrainingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const t = trainings.find(t => t.id === Number(e.target.value)) ?? null;
    setSelectedTraining(t);
    if (t) loadQuestions(t.id);
  };

  const addCollaborator = (emp?: Employee) => {
    const entry: CollaboratorEntry = {
      employee: emp,
      employee_name: emp?.name ?? '',
      desired_level: 'INDEPENDENTE',
      is_effective: true,
      ineffective_reason: '',
      has_height_work: false,
      has_confined_work: false,
      answers: {},
      expanded: true,
    };
    setCollaborators(prev => [...prev, entry]);
    setShowEmpSearch(false);
    setEmpSearch('');
    setEmpResults([]);
  };

  const removeCollaborator = (i: number) => {
    setCollaborators(prev => prev.filter((_, idx) => idx !== i));
  };

  const updateCollab = (i: number, update: Partial<CollaboratorEntry>) => {
    setCollaborators(prev => prev.map((c, idx) => idx === i ? { ...c, ...update } : c));
  };

  const setAnswer = (collabIdx: number, qid: number, ans: Answer) => {
    setCollaborators(prev => prev.map((c, i) => {
      if (i !== collabIdx) return c;
      return { ...c, answers: { ...c.answers, [qid]: ans } };
    }));
  };

  const visibleQuestions = (collab: CollaboratorEntry): Question[] => {
    return questions.filter(q => {
      if (q.type === 'height_exec' && !collab.has_height_work) return false;
      if (q.type === 'confined_exec' && !collab.has_confined_work) return false;
      if (q.type === 'height_confined_check') return selectedTraining?.has_height || selectedTraining?.has_confined;
      return true;
    });
  };

  const step1Valid = evaluatorEmail && trainingDate && selectedTraining && selectedUnit;

  function collabAnswersValid(c: CollaboratorEntry): boolean {
    const qs = visibleQuestions(c).filter(q => q.type !== 'height_confined_check');
    if (!qs.every(q => c.answers[q.id])) return false;
    // safety_general and tecnica must be CONFORME or NAO_CONFORME
    const mandatory = qs.filter(q => q.type === 'safety_general' || q.type === 'tecnica');
    return mandatory.every(q => c.answers[q.id] !== 'NA');
  }

  const step2Valid = collaborators.length > 0 && collaborators.every(c =>
    c.employee_name ? collabAnswersValid(c) : false
  );

  const submit = async () => {
    setSaving(true);
    try {
      // Find real unit id from the list
      const unitIdFromApi = await fetch('/api/colaboradores?q=')
        .then(r => r.json())
        .then((emps: Employee[]) => {
          const match = emps.find(e => e.unit_name === selectedUnit?.name);
          return match?.id ?? null;
        });

      // Build payload — we need unit_id from the db
      // Since units API isn't separate, use training_id from training, and unit from evaluations
      const payload = {
        evaluator_email: evaluatorEmail,
        evaluator_name: evaluatorName,
        evaluation_date: evaluationDate,
        training_date: trainingDate,
        training_id: selectedTraining!.id,
        unit_id: 1, // Will be resolved server-side if needed; we pass unit name
        unit_name: selectedUnit?.name,
        collaborators: collaborators.map(c => ({
          employee_id: c.employee?.id,
          employee_name: c.employee_name,
          desired_level: c.desired_level,
          is_effective: c.is_effective,
          ineffective_reason: c.ineffective_reason,
          has_height_work: c.has_height_work,
          has_confined_work: c.has_confined_work,
          answers: visibleQuestions(c)
            .filter(q => q.type !== 'height_confined_check')
            .map(q => ({
              question_id: q.id,
              question_text: q.text,
              answer: c.answers[q.id] ?? 'NA',
            })),
        })),
      };

      const res = await fetch('/api/avaliacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      router.push(`/avaliacoes/${data.id}`);
    } finally {
      setSaving(false);
    }
  };

  const categoryGroups: Record<string, Training[]> = {};
  trainings.forEach(t => {
    if (!categoryGroups[t.category]) categoryGroups[t.category] = [];
    categoryGroups[t.category].push(t);
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Nova Avaliação</h2>
        <p className="text-sm text-gray-500">Registre a eficácia de um treinamento para um ou mais colaboradores</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[{ n: 1, label: 'Dados Gerais' }, { n: 2, label: 'Colaboradores' }, { n: 3, label: 'Revisão' }].map(s => (
          <div key={s.n} className="flex items-center gap-2">
            <button
              onClick={() => step > s.n && setStep(s.n)}
              className={cn(
                'w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center',
                step === s.n ? 'bg-brand-600 text-white' :
                  step > s.n ? 'bg-brand-100 text-brand-700 cursor-pointer' :
                    'bg-gray-100 text-gray-400'
              )}
            >{s.n}</button>
            <span className={cn('text-sm', step === s.n ? 'font-semibold text-gray-800' : 'text-gray-400')}>{s.label}</span>
            {s.n < 3 && <div className="w-8 h-px bg-gray-200 mx-1" />}
          </div>
        ))}
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <h3 className="font-semibold text-gray-800">Dados da Avaliação</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail do Avaliador *</label>
              <input
                value={evaluatorEmail}
                onChange={e => setEvaluatorEmail(e.target.value)}
                type="email"
                placeholder="avaliador@3coracoes.com.br"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Avaliador</label>
              <input
                value={evaluatorName}
                onChange={e => setEvaluatorName(e.target.value)}
                placeholder="Nome completo"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data da Avaliação *</label>
              <input
                value={evaluationDate}
                onChange={e => setEvaluationDate(e.target.value)}
                type="date"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data do Treinamento *</label>
              <input
                value={trainingDate}
                onChange={e => setTrainingDate(e.target.value)}
                type="date"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unidade *</label>
            <select
              value={selectedUnit?.name ?? ''}
              onChange={e => setSelectedUnit(units.find(u => u.name === e.target.value) ?? null)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              <option value="">Selecione a unidade...</option>
              {units.map(u => <option key={u.name} value={u.name}>{u.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Treinamento *</label>
            <select
              value={selectedTraining?.id ?? ''}
              onChange={handleTrainingChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              <option value="">Selecione o treinamento...</option>
              {Object.entries(categoryGroups).map(([cat, ts]) => (
                <optgroup key={cat} label={cat}>
                  {ts.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </optgroup>
              ))}
            </select>
          </div>

          {selectedTraining && questions.length > 0 && (
            <div className="bg-brand-50 border border-brand-100 rounded-lg p-3">
              <p className="text-xs font-medium text-brand-700 mb-1">Questões deste treinamento ({questions.length}):</p>
              <ul className="text-xs text-brand-600 space-y-1">
                {questions.map(q => <li key={q.id} className="truncate">• {q.text}</li>)}
              </ul>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!step1Valid}
              className="bg-brand-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Próximo →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">
                Colaboradores <span className="text-gray-400 font-normal">({collaborators.length}/12)</span>
              </h3>
              {collaborators.length < 12 && (
                <button
                  onClick={() => setShowEmpSearch(v => !v)}
                  className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium"
                >
                  <Plus size={15} /> Adicionar colaborador
                </button>
              )}
            </div>

            {showEmpSearch && (
              <div className="mb-4 border border-brand-200 rounded-lg p-3 bg-brand-50">
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    autoFocus
                    value={empSearch}
                    onChange={e => setEmpSearch(e.target.value)}
                    placeholder="Buscar colaborador por nome ou matrícula..."
                    className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {empResults.map(e => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => addCollaborator(e)}
                      className="w-full text-left px-3 py-2 text-sm rounded-lg bg-white hover:bg-brand-100 border border-gray-100"
                    >
                      <span className="font-medium">{e.name}</span>
                      <span className="text-gray-400 ml-2 text-xs">{e.registration} · {e.position}</span>
                    </button>
                  ))}
                  {empSearch.length >= 2 && empResults.length === 0 && (
                    <>
                      <p className="text-xs text-gray-400 px-2 py-1">Colaborador não encontrado na base. Inserir manualmente:</p>
                      <button
                        type="button"
                        onClick={() => addCollaborator()}
                        className="w-full text-left px-3 py-2 text-sm rounded-lg bg-white hover:bg-brand-100 border border-dashed border-brand-300 text-brand-600"
                      >
                        + Adicionar &quot;{empSearch}&quot; manualmente
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {collaborators.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">
                Nenhum colaborador adicionado. Clique em &quot;Adicionar colaborador&quot; acima.
              </p>
            )}
          </div>

          {collaborators.map((collab, ci) => {
            const qs = visibleQuestions(collab);
            const scored = qs.filter(q => q.type !== 'height_confined_check' && collab.answers[q.id] && collab.answers[q.id] !== 'NA');
            const correct = scored.filter(q => collab.answers[q.id] === 'CONFORME').length;
            return (
              <div key={ci} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div
                  className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => updateCollab(ci, { expanded: !collab.expanded })}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center">
                      {ci + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{collab.employee_name || 'Colaborador sem nome'}</p>
                      {collab.employee && (
                        <p className="text-xs text-gray-400">{collab.employee.position} · {collab.employee.unit_name}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {scored.length > 0 && (
                      <span className="text-xs text-gray-500">{correct}/{scored.length} acertos</span>
                    )}
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); removeCollaborator(ci); }}
                      className="text-red-400 hover:text-red-600 p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                    {collab.expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </div>

                {collab.expanded && (
                  <div className="px-5 pb-5 space-y-4 border-t border-gray-100">
                    {!collab.employee && (
                      <div className="pt-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Nome do Colaborador *</label>
                        <input
                          value={collab.employee_name}
                          onChange={e => updateCollab(ci, { employee_name: e.target.value })}
                          placeholder="Nome completo"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                        />
                      </div>
                    )}

                    <div className="pt-3">
                      <div className="rounded-lg border border-gray-100 bg-gray-50 divide-y divide-gray-100 text-[11px] leading-relaxed">
                        <div className="flex gap-2 px-3 py-2">
                          <span className="shrink-0">🔴</span>
                          <span><strong>Nível 1 (Reativo) — 0 acertos:</strong> O colaborador não demonstra a execução segura das etapas do procedimento padrão. Necessita de supervisão constante e instruções detalhadas para qualquer execução.</span>
                        </div>
                        <div className="flex gap-2 px-3 py-2">
                          <span className="shrink-0">🟡</span>
                          <span><strong>Nível 2 (Dependente) — 1 a n-1 acertos:</strong> O colaborador apresenta desempenho parcial, executando apenas partes do processo com desvios técnicos ou de segurança. Precisa de suporte e supervisão para executar com confiança e precisão.</span>
                        </div>
                        <div className="flex gap-2 px-3 py-2">
                          <span className="shrink-0">🟢</span>
                          <span><strong>Nível 3 (Independente) — 100% de acertos:</strong> O colaborador executa o procedimento nos padrões de qualidade e tempo esperados, com plena autonomia operacional.</span>
                        </div>
                      </div>
                    </div>

                    {/* Height/Confined check */}
                    {selectedTraining && (selectedTraining.has_height || selectedTraining.has_confined) && (
                      <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 space-y-2">
                        <p className="text-xs font-medium text-yellow-800">Este procedimento envolve atividades especiais?</p>
                        <div className="flex gap-4">
                          {selectedTraining.has_height ? (
                            <label className="flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={collab.has_height_work}
                                onChange={e => updateCollab(ci, { has_height_work: e.target.checked })}
                                className="rounded"
                              />
                              Trabalho em Altura
                            </label>
                          ) : null}
                          {selectedTraining.has_confined ? (
                            <label className="flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={collab.has_confined_work}
                                onChange={e => updateCollab(ci, { has_confined_work: e.target.checked })}
                                className="rounded"
                              />
                              Espaço Confinado
                            </label>
                          ) : null}
                        </div>
                      </div>
                    )}

                    {/* Questions */}
                    {(() => {
                      const scoredQs = qs.filter(q => q.type !== 'height_confined_check');
                      const mandatoryQs = scoredQs.filter(q => q.type === 'safety_general' || q.type === 'tecnica');
                      const mandatoryAnswered = mandatoryQs.filter(q =>
                        collab.answers[q.id] === 'CONFORME' || collab.answers[q.id] === 'NAO_CONFORME'
                      ).length;
                      const required = mandatoryQs.length;
                      const needsMore = mandatoryAnswered < required;
                      return (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Questões de Avaliação</p>
                            <span className={cn(
                              'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                              needsMore ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                            )}>
                              {mandatoryAnswered}/{required} obrigatórias respondidas
                            </span>
                          </div>
                          {scoredQs.map(q => {
                            const isMandatory = q.type === 'safety_general' || q.type === 'tecnica';
                            return (
                              <div key={q.id} className={cn(
                                'border rounded-lg p-3',
                                isMandatory ? 'border-brand-200 bg-brand-50' : 'border-gray-100 bg-gray-50'
                              )}>
                                <div className="flex items-start gap-2 mb-2">
                                  {isMandatory && (
                                    <span className="shrink-0 text-[10px] font-bold text-brand-700 bg-brand-100 border border-brand-200 px-1.5 py-0.5 rounded uppercase tracking-wide">
                                      Obrigatória
                                    </span>
                                  )}
                                  <p className="text-xs text-gray-700 leading-relaxed">{q.text}</p>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                  <AnswerBtn value="CONFORME" current={collab.answers[q.id] ?? 'NA'} onChange={a => setAnswer(ci, q.id, a)} label="Conforme" icon={CheckCircle} color="green" />
                                  <AnswerBtn value="NAO_CONFORME" current={collab.answers[q.id] ?? 'NA'} onChange={a => setAnswer(ci, q.id, a)} label="Não Conforme" icon={XCircle} color="red" />
                                  {!isMandatory && (
                                    <AnswerBtn value="NA" current={collab.answers[q.id] ?? 'NA'} onChange={a => setAnswer(ci, q.id, a)} label="N/A" icon={MinusCircle} color="gray" />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {needsMore && scoredQs.some(q => collab.answers[q.id]) && (
                            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                              Responda as questões obrigatórias (Técnica e Segurança Geral) com Conforme ou Não Conforme.
                            </p>
                          )}
                        </div>
                      );
                    })()}

                  </div>
                )}
              </div>
            );
          })}

          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-gray-700">← Voltar</button>
            <button
              onClick={() => setStep(3)}
              disabled={!step2Valid}
              className="bg-brand-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Revisar →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 — Review */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Revisão da Avaliação</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div><span className="text-gray-500">Avaliador:</span> <span className="font-medium">{evaluatorName || evaluatorEmail}</span></div>
              <div><span className="text-gray-500">Unidade:</span> <span className="font-medium">{selectedUnit?.name}</span></div>
              <div><span className="text-gray-500">Treinamento:</span> <span className="font-medium">{selectedTraining?.name}</span></div>
              <div><span className="text-gray-500">Data do treinamento:</span> <span className="font-medium">{trainingDate}</span></div>
              <div><span className="text-gray-500">Data da avaliação:</span> <span className="font-medium">{evaluationDate}</span></div>
              <div><span className="text-gray-500">Colaboradores:</span> <span className="font-medium">{collaborators.length}</span></div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Colaborador</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Respostas</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Eficaz?</th>
                </tr>
              </thead>
              <tbody>
                {collaborators.map((c, i) => {
                  const qs = visibleQuestions(c).filter(q => q.type !== 'height_confined_check');
                  const conf = qs.filter(q => c.answers[q.id] === 'CONFORME').length;
                  const nc = qs.filter(q => c.answers[q.id] === 'NAO_CONFORME').length;
                  const na = qs.filter(q => !c.answers[q.id] || c.answers[q.id] === 'NA').length;
                  return (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{c.employee_name}</td>
                      <td className="px-4 py-3">
                        <span className="text-green-600 font-medium">{conf}✓</span>
                        {' · '}
                        <span className="text-red-500 font-medium">{nc}✗</span>
                        {na > 0 && <span className="text-gray-400"> · {na} N/A</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={c.is_effective ? 'text-green-600' : 'text-red-500'}>
                          {c.is_effective ? 'Sim' : 'Não'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="text-sm text-gray-500 hover:text-gray-700">← Voltar</button>
            <button
              onClick={submit}
              disabled={saving}
              className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Salvando...' : 'Salvar Avaliação'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NovaAvaliacaoPage() {
  return (
    <AuthGuard required="gestor">
      <NovaAvaliacaoPageContent />
    </AuthGuard>
  );
}

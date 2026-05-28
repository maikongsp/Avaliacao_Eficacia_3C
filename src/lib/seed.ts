import Database from 'better-sqlite3';

export function seedDatabase(db: Database.Database) {
  const row = db.prepare('SELECT done FROM seed_done WHERE id = 1').get() as { done: number } | undefined;
  if (row?.done) return;

  db.prepare('INSERT OR REPLACE INTO seed_done (id, done) VALUES (1, 1)').run();

  // ── CATEGORIES ────────────────────────────────────────────────────────────
  const insertCat = db.prepare('INSERT INTO categories (name, code) VALUES (?, ?)');
  const categories = [
    ['Qualidade', 'QUALIDADE'],
    ['Meio Ambiente', 'MEIO_AMBIENTE'],
    ['Técnico da Função - Produção', 'TF_PRODUCAO'],
    ['Técnico da Função - Manutenção', 'TF_MANUTENCAO'],
    ['Técnico da Função - Garantia da Qualidade', 'TF_GQ'],
    ['Técnico da Função - Controle da Qualidade', 'TF_CQ'],
  ] as const;
  for (const [name, code] of categories) insertCat.run(name, code);

  const catId = (code: string): number =>
    (db.prepare('SELECT id FROM categories WHERE code = ?').get(code) as { id: number }).id;

  // ── SHARED QUESTIONS (safety) ──────────────────────────────────────────────
  const insertQ = db.prepare('INSERT INTO questions (text, type) VALUES (?, ?)');

  const qNR11 = insertQ.run(
    'O colaborador utiliza técnicas seguras e equipamentos adequados para levantar, transportar e depositar materiais? (NR 11)',
    'safety_nr11'
  ).lastInsertRowid as number;

  const qNR12 = insertQ.run(
    'Dispositivos de segurança da máquina/equipamento estão ativos e sendo utilizados corretamente? (NR 12)',
    'safety_nr12'
  ).lastInsertRowid as number;

  const qSafGeneral = insertQ.run(
    'O colaborador dispõe de todos os recursos necessários para realizar a tarefa sem improvisações e demonstra conhecimento dos riscos e utilização correta dos equipamentos de segurança?',
    'safety_general'
  ).lastInsertRowid as number;

  const qLockout = insertQ.run(
    'O colaborador realiza a inspeção de pré-uso, opera o equipamento sem burlar ou remover as proteções e garante que, em qualquer intervenção, o bloqueio de energias seja rigorosamente aplicado?',
    'safety_lockout'
  ).lastInsertRowid as number;

  const qHeightCheck = insertQ.run(
    'O procedimento avaliado possui trabalho em altura, em espaço confinado ou os dois?',
    'height_confined_check'
  ).lastInsertRowid as number;

  const qHeightExec = insertQ.run(
    'O colaborador demonstra pleno conhecimento dos procedimentos de segurança e utiliza corretamente todos os equipamentos de proteção (cinto, trava-quedas, etc.) em atividades com altura igual ou superior a 2 metros? (Trabalho em Altura)',
    'height_exec'
  ).lastInsertRowid as number;

  const qConfinedExec = insertQ.run(
    'O colaborador realiza atividades em Espaço Confinado sempre acompanhado e seguindo rigorosamente todos os protocolos de entrada, como verificação de gases, permissão de trabalho e cuidados contidos na APR? (Espaço Confinado)',
    'confined_exec'
  ).lastInsertRowid as number;

  // ── TRAININGS ─────────────────────────────────────────────────────────────
  type TrainingDef = {
    name: string;
    full_name?: string;
    category: string;
    has_nr11?: boolean;
    has_nr12?: boolean;
    has_lockout?: boolean;
    has_height?: boolean;
    has_confined?: boolean;
    tech_question: string;
    extra_questions?: number[];
  };

  const insertT = db.prepare(`
    INSERT INTO trainings (name, full_name, category_id, has_nr11, has_nr12, has_lockout, has_height, has_confined)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertTQ = db.prepare('INSERT INTO training_questions (training_id, question_id, sort_order) VALUES (?, ?, ?)');

  const addTraining = (def: TrainingDef): number => {
    const catIdVal = catId(def.category);
    const tid = insertT.run(
      def.name,
      def.full_name ?? def.name,
      catIdVal,
      def.has_nr11 ? 1 : 0,
      def.has_nr12 ? 1 : 0,
      def.has_lockout ? 1 : 0,
      def.has_height ? 1 : 0,
      def.has_confined ? 1 : 0
    ).lastInsertRowid as number;

    // Technical question
    const techId = insertQ.run(def.tech_question, 'tecnica').lastInsertRowid as number;
    insertTQ.run(tid, techId, 1);

    // Safety general (applies to all categories)
    insertTQ.run(tid, qSafGeneral, 2);

    // Category-specific safety
    if (def.has_nr11) insertTQ.run(tid, qNR11, 3);
    if (def.has_nr12) insertTQ.run(tid, qNR12, 4);
    if (def.has_lockout) insertTQ.run(tid, qLockout, 5);
    if (def.has_height) {
      insertTQ.run(tid, qHeightCheck, 6);
      insertTQ.run(tid, qHeightExec, 7);
    }
    if (def.has_confined) {
      insertTQ.run(tid, qConfinedExec, 8);
    }

    // Any extra shared questions
    (def.extra_questions ?? []).forEach((qid, i) => insertTQ.run(tid, qid, 10 + i));

    return tid;
  };

  // QUALIDADE
  addTraining({
    name: 'Boas Práticas De Fabricação / Programa De Pré-Requisitos',
    category: 'QUALIDADE',
    tech_question: 'O colaborador garante a prática dos protocolos de Boas Praticas de Fabricação entregando higiene pessoal, do ambiente, do processo e de equipamentos, aplicando condutas comportamentais de acordo com os requisitos normativos estabelecidos?',
  });
  addTraining({
    name: 'APPCC - Análise De Perigos E Pontos Críticos De Controle',
    category: 'QUALIDADE',
    tech_question: 'O colaborador demonstra conhecimento sobre os perigos (físicos, químicos ou biológicos) inerentes à sua atividade e sabe como agir ou a quem reportar caso identifique uma falha no processo que possa comprometer a segurança do produto?',
  });
  addTraining({
    name: 'Conscientização do Programa de Controle de Alergênicos',
    category: 'QUALIDADE',
    tech_question: 'Durante a execução das atividades os colaboradores demonstram cuidado e capacidade de prevenir contaminações cruzadas de alergênicos em seu ambiente de processo? Ex.: Cumprimento dos zoneamentos estabelecidos por alergênicos, uso de utensílios seguros e específicos, etc.',
  });

  // MEIO AMBIENTE
  addTraining({
    name: 'ISO 14001 - Sistema de Gestão Ambiental',
    category: 'MEIO_AMBIENTE',
    has_nr11: true,
    has_nr12: true,
    tech_question: 'O colaborador compreende a Política Integrada do Sistema de Gestão da empresa e alinha suas ações diárias aos objetivos ambientais?',
  });
  addTraining({
    name: 'Gestão de Resíduos',
    category: 'MEIO_AMBIENTE',
    has_nr11: true,
    has_nr12: true,
    tech_question: 'Ele executa a separação correta dos resíduos descartados em seu posto de trabalho, respeitando os fluxos de descarte estabelecidos e sabem os impactos do descarte inadequado?',
  });
  addTraining({
    name: 'Levantamento de Aspectos e Impactos Ambientais (LAIA)',
    category: 'MEIO_AMBIENTE',
    has_nr11: true,
    has_nr12: true,
    tech_question: 'O colaborador consegue identificar os possíveis impactos ambientais causados por suas atividades e reconhece quais controles operacionais devem ser aplicados para mitigar esses impactos?',
  });
  addTraining({
    name: 'Gestão de Químicos',
    category: 'MEIO_AMBIENTE',
    has_nr11: true,
    has_nr12: true,
    tech_question: 'Ele conhece os perigos dos produtos utilizados em sua área e a forma de manuseio de acordo com as normas de segurança (FDS)?',
  });
  addTraining({
    name: 'Meio Ambiente | Utilizar Kit de Mitigação Ambiental',
    category: 'MEIO_AMBIENTE',
    has_nr11: true,
    has_nr12: true,
    tech_question: 'O colaborador possui clareza sobre a localização dos recursos de emergência ambiental e sabe como reagir prontamente em caso de derramamentos ou vazamentos?',
  });
  addTraining({
    name: 'Identificação, Coleta e Acondicionamento de Resíduos',
    category: 'MEIO_AMBIENTE',
    has_nr11: true,
    has_nr12: true,
    tech_question: 'É possível identificar que o colaborador compreende os critérios de classificação e garante que o armazenamento dos resíduos gerados conforme classificação dos resíduos?',
  });

  // T.F. PRODUÇÃO
  addTraining({
    name: 'T.F Produção | Codificação, Identificação e Rastreabilidade dos produtos',
    category: 'TF_PRODUCAO',
    has_nr11: true,
    has_lockout: true,
    has_height: true,
    has_confined: true,
    tech_question: 'O colaborador garante a identificação correta e o registro preciso dos dados em todas as etapas, assegurando que o histórico do item possa ser recuperado sem erros?',
  });
  addTraining({
    name: 'T.F Produção | Controle, Manuseio de cafes, Movimentação, Armazenamento, Embalagem, Preservação e Entrega',
    category: 'TF_PRODUCAO',
    has_nr11: true,
    has_lockout: true,
    has_height: true,
    has_confined: true,
    tech_question: 'O colaborador manipula, armazena e embala os itens seguindo rigorosamente as normas de preservação para evitar qualquer dano, perda ou degradação durante o processo?',
  });
  addTraining({
    name: 'T.F Produção | Realizar limpeza em geral (equipamentos e local de trabalho)',
    category: 'TF_PRODUCAO',
    has_nr11: true,
    has_lockout: true,
    has_height: true,
    has_confined: true,
    tech_question: 'O colaborador mantém o equipamento e o posto de trabalho em condições ideais de higiene e organização, utilizando os recursos de limpeza de forma adequada e segura?',
  });
  addTraining({
    name: 'T.F Produção | Realizar operação de equipamento',
    category: 'TF_PRODUCAO',
    has_nr11: true,
    has_lockout: true,
    has_height: true,
    has_confined: true,
    tech_question: 'O colaborador opera o equipamento com segurança e eficiência técnica, respeitando os parâmetros operacionais e identificando precocemente desvios de funcionamento?',
  });

  // T.F. MANUTENÇÃO
  addTraining({
    name: 'T.F Manutenção | Gestão da Manutenção',
    category: 'TF_MANUTENCAO',
    has_nr11: true,
    has_lockout: true,
    has_height: true,
    has_confined: true,
    tech_question: 'O colaborador demonstra compreender os processos administrativos e as diretrizes de priorização da área, executando suas tarefas em conformidade com os padrões de gestão locais?',
  });
  addTraining({
    name: 'T.F Manutenção | Execução de Rotina',
    category: 'TF_MANUTENCAO',
    has_nr11: true,
    has_lockout: true,
    has_height: true,
    has_confined: true,
    tech_question: 'Após o treinamento, o colaborador realiza corretamente a abertura, o encerramento, reserva de materiais em Ordens de Serviço (OS) via mobile ITSS, seguindo o fluxo de programação?',
  });
  addTraining({
    name: 'T.F Manutenção | Técnicas, Padrões e Confiabilidade',
    category: 'TF_MANUTENCAO',
    has_nr11: true,
    has_lockout: true,
    has_height: true,
    has_confined: true,
    tech_question: 'O colaborador aplica as metodologias de analise de confiabilidade, manutenções preditivas e validações de serviços externos?',
  });

  // T.F. GARANTIA DA QUALIDADE
  addTraining({
    name: 'T.F GQ | Programa de Pré Requisitos',
    category: 'TF_GQ',
    tech_question: 'O colaborador demonstra conhecimento nos Programas de Pré-requisitos e cumpre as rotinas e processos estabelecidos? É proativo e resolutivo quando percebe desvios relacionados as Boas Práticas de Fabricação?',
  });
  addTraining({
    name: 'T.F GQ | Certificações (Sistema de Gestão Integrado)',
    category: 'TF_GQ',
    tech_question: 'O colaborador demonstra conhecimento e aplicação prática das diretrizes do Sistema de Gestão Integrado, cumprindo os procedimentos gerais de controle documental e de não conformidades, garantindo a qualidade e o controle de impactos ambientais?',
  });
  addTraining({
    name: 'T.F GQ | Meio Ambiente',
    category: 'TF_GQ',
    tech_question: 'O colaborador integra os requisitos do Sistema de Gestão Ambiental em suas rotinas de inspeção e auditoria de qualidade e meio ambiente, demonstrando capacidade analítica para identificar desvios e garantir a aplicação dos controles operacionais?',
  });
  addTraining({
    name: 'T.F GQ | Laboratório 3C Lab',
    category: 'TF_GQ',
    tech_question: 'O colaborador demonstra rigor técnico e conformidade normativa ao executar o plano de monitoramento e inspeção, garantindo a confiabilidade das análises laboratoriais e a eficácia dos controles preventivos?',
  });

  // T.F. CONTROLE DA QUALIDADE
  addTraining({
    name: 'T.F CQ | Controle de Recebimento, Processos e Liberação de Produto Final',
    category: 'TF_CQ',
    tech_question: 'O colaborador segue o plano de monitoramento e inspeção estabelecido, seguindo as diretrizes de frequência, amostragem e verificação de conformidade das especificações, conforme instruções de trabalho definidas?',
  });

  // ── UNITS ─────────────────────────────────────────────────────────────────
  const insertUnit = db.prepare('INSERT OR IGNORE INTO units (name, region, directorship, branch) VALUES (?, ?, ?, ?)');
  const unitData = [
    ['ARACARIGUAMA FABRICA', '05 - REGIONAL RH - SP', 'DIRETORIA INDUSTRIAL', 'ARACARIGUAMA'],
    ['BARBALHA', '01 - REGIONAL RH - NO', 'DIRETORIA INDUSTRIAL', 'BARBALHA'],
    ['BELEM', '01 - REGIONAL RH - NO', 'DIRETORIA INDUSTRIAL', 'BENEVIDES'],
    ['BRASILIA', '03 - REGIONAL RH - CO', 'DIRETORIA INDUSTRIAL', 'BRASILIA'],
    ['CAMPO GRANDE', '03 - REGIONAL RH - CO', 'DIRETORIA INDUSTRIAL', 'CAMPO GRANDE'],
    ['CUIABA FABRICA', '03 - REGIONAL RH - CO', 'DIRETORIA INDUSTRIAL', 'CUIABA'],
    ['ESPIRITO SANTO', '04 - REGIONAL RH - SE', 'DIRETORIA INDUSTRIAL', 'VIANA'],
    ['EUSEBIO FABRICA', '01 - REGIONAL RH - NO', 'DIRETORIA INDUSTRIAL', 'EUSEBIO'],
    ['JOAO PESSOA', '02 - REGIONAL RH - NE', 'DIRETORIA INDUSTRIAL', 'JOAO PESSOA'],
    ['LONDRINA', '06 - REGIONAL RH - SUL', 'DIRETORIA INDUSTRIAL', 'LONDRINA'],
    ['MACEIO', '02 - REGIONAL RH - NE', 'DIRETORIA INDUSTRIAL', 'MACEIO'],
    ['MANAUS FABRICA', '01 - REGIONAL RH - NO', 'DIRETORIA INDUSTRIAL', 'MANAUS'],
    ['MONTES CLAROS 3CAFFI', '04 - REGIONAL RH - SE', 'DIRETORIA INDUSTRIAL', 'MONTES CLAROS'],
    ['MOSSORO FRISCO', '02 - REGIONAL RH - NE', 'DIRETORIA INDUSTRIAL', 'MOSSORO'],
    ['MOSSORO MOINHO', '02 - REGIONAL RH - NE', 'DIRETORIA INDUSTRIAL', 'MOSSORO'],
    ['NATAL', '02 - REGIONAL RH - NE', 'DIRETORIA INDUSTRIAL', 'NATAL'],
    ['NATAL INST', '02 - REGIONAL RH - NE', 'DIRETORIA INDUSTRIAL', 'NATAL'],
    ['NATAL T&M', '02 - REGIONAL RH - NE', 'DIRETORIA INDUSTRIAL', 'NATAL'],
    ['PARANA', '06 - REGIONAL RH - SUL', 'DIRETORIA INDUSTRIAL', 'PINHAIS'],
    ['RECIFE', '02 - REGIONAL RH - NE', 'DIRETORIA INDUSTRIAL', 'JABOATAO DOS GUARARAPES'],
    ['RIO FILTRO', '04 - REGIONAL RH - SE', 'DIRETORIA INDUSTRIAL', 'NOVA IGUACU'],
    ['RIO GRANDE DO SUL', '06 - REGIONAL RH - SUL', 'DIRETORIA INDUSTRIAL', 'GRAVATAI'],
    ['SALVADOR', '02 - REGIONAL RH - NE', 'DIRETORIA INDUSTRIAL', 'SALVADOR'],
    ['SANTA LUZIA', '04 - REGIONAL RH - SE', 'DIRETORIA INDUSTRIAL', 'SANTA LUZIA'],
    ['SANTA LUZIA INST', '04 - REGIONAL RH - SE', 'DIRETORIA INDUSTRIAL', 'SANTA LUZIA'],
    ['SANTA LUZIA T&M', '04 - REGIONAL RH - SE', 'DIRETORIA INDUSTRIAL', 'SANTA LUZIA'],
    ['SAO LUIS', '01 - REGIONAL RH - NO', 'DIRETORIA INDUSTRIAL', 'SAO JOSE DE RIBAMAR'],
    ['SAO PAULO', '05 - REGIONAL RH - SP', 'DIRETORIA INDUSTRIAL', 'GUARULHOS'],
    ['TERESINA', '01 - REGIONAL RH - NO', 'DIRETORIA INDUSTRIAL', 'TERESINA'],
    ['VESPASIANO', '04 - REGIONAL RH - SE', 'DIRETORIA INDUSTRIAL', 'VESPASIANO'],
  ] as const;
  for (const u of unitData) insertUnit.run(...u);

  // ── EMPLOYEES (Diretoria Industrial - Aracariguama sample) ────────────────
  const getUnitId = (name: string): number | null => {
    const r = db.prepare('SELECT id FROM units WHERE name = ?').get(name) as { id: number } | undefined;
    return r?.id ?? null;
  };

  const insertEmp = db.prepare(`
    INSERT INTO employees (name, registration, unit_id, position, section, function_code, admission_date, employment_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const employees = [
    { name: 'ADRIANE BASTOS DOS SANTOS', reg: '17-50539', unit: 'ARACARIGUAMA FABRICA', pos: 'AUXILIAR DE PRODUCAO I', sec: 'EMPACOTAMENTO ALMOFADA', func: '20178', adm: '2025-06-17', type: 'NORMAL' },
    { name: 'ALBERTO LEANDRO DE SOUZA PAVANINI ROMANO', reg: '17-50439', unit: 'ARACARIGUAMA FABRICA', pos: 'OPERADOR DE MOINHOS', sec: 'MOAGEM', func: '20367', adm: '2024-09-09', type: 'NORMAL' },
    { name: 'ALINE CRISTINE DE CAMARGO DA CRUZ', reg: '17-50545', unit: 'ARACARIGUAMA FABRICA', pos: 'AUXILIAR DE PRODUCAO I', sec: 'EMPACOTAMENTO ALMOFADA', func: '20178', adm: '2025-08-04', type: 'NORMAL' },
    { name: 'ALISANDRA BATISTA DA SILVA', reg: '17-50421', unit: 'ARACARIGUAMA FABRICA', pos: 'OPERADOR DE MOINHOS', sec: 'MOAGEM', func: '20367', adm: '2024-06-12', type: 'NORMAL' },
    { name: 'AMARO SILVESTRE DE ANDRADE', reg: '17-50010', unit: 'ARACARIGUAMA FABRICA', pos: 'AUXILIAR DE EXPEDICAO', sec: 'EXPEDICAO FABRIL', func: '20168', adm: '1995-01-09', type: 'NORMAL' },
    { name: 'ANA PAULA DOS SANTOS ALVES', reg: '17-50013', unit: 'ARACARIGUAMA FABRICA', pos: 'OPERADOR DE PRODUCAO IV', sec: 'EMPACOTAMENTO ALMOFADA', func: '20375', adm: '2015-04-15', type: 'NORMAL' },
    { name: 'ANDERSON ISMAEL PEREIRA DA SILVA', reg: '17-50541', unit: 'ARACARIGUAMA FABRICA', pos: 'AUXILIAR DE MATERIA PRIMA', sec: 'ARMAZEM DE MATERIA-PRIMA', func: '20935', adm: '2025-07-01', type: 'NORMAL' },
    { name: 'ANTONIO CARLOS NUNES PORTO', reg: '17-50023', unit: 'ARACARIGUAMA FABRICA', pos: 'AUXILIAR DE EXPEDICAO', sec: 'EXPEDICAO FABRIL', func: '20168', adm: '1998-04-06', type: 'NORMAL' },
    { name: 'CICERA MARIA SILVA SOUSA', reg: '17-50040', unit: 'ARACARIGUAMA FABRICA', pos: 'OPERADOR DE PRODUCAO IV', sec: 'EMPACOTAMENTO VACUO', func: '20375', adm: '2012-09-20', type: 'NORMAL' },
    { name: 'CICERO LOPES DINIS', reg: '17-50371', unit: 'ARACARIGUAMA FABRICA', pos: 'OPERADOR DE EMPILHADEIRA', sec: 'ARMAZEM DE MATERIA-PRIMA', func: '20357', adm: '2023-03-16', type: 'NORMAL' },
    // EUSEBIO FABRICA
    { name: 'ANTONIO DIEGO DELFINO NUNES', reg: '1-53511', unit: 'EUSEBIO FABRICA', pos: 'OPERADOR DE PRODUCAO III', sec: 'PRODUCAO', func: '20374', adm: '2018-03-12', type: 'NORMAL' },
    { name: 'CARLOS HENRIQUE LIMA SOUZA', reg: '1-53400', unit: 'EUSEBIO FABRICA', pos: 'AUXILIAR DE PRODUCAO I', sec: 'TORREFACAO', func: '20178', adm: '2022-07-05', type: 'NORMAL' },
    { name: 'FERNANDA OLIVEIRA COSTA', reg: '1-53210', unit: 'EUSEBIO FABRICA', pos: 'OPERADORA DE PRODUCAO II', sec: 'EMPACOTAMENTO', func: '20373', adm: '2020-01-15', type: 'NORMAL' },
    { name: 'JOAO MARCOS ALVES SILVA', reg: '1-53350', unit: 'EUSEBIO FABRICA', pos: 'TÉCNICO DE MANUTENÇÃO', sec: 'MANUTENÇÃO', func: '20290', adm: '2019-05-20', type: 'NORMAL' },
    { name: 'MARIA JOSE SANTOS', reg: '1-53100', unit: 'EUSEBIO FABRICA', pos: 'SUPERVISORA DE QUALIDADE', sec: 'QUALIDADE', func: '20500', adm: '2015-08-10', type: 'NORMAL' },
    // MOSSORO MOINHO
    { name: 'ALEX MAX SILVA FERINO', reg: '2-30150', unit: 'MOSSORO MOINHO', pos: 'OPERADOR DE MOINHO', sec: 'MOAGEM', func: '20367', adm: '2021-03-08', type: 'NORMAL' },
    { name: 'PATRICIA NUNES BEZERRA', reg: '2-30200', unit: 'MOSSORO MOINHO', pos: 'AUXILIAR DE PRODUCAO I', sec: 'ENSAQUE', func: '20178', adm: '2022-11-14', type: 'NORMAL' },
    { name: 'ROBERTO CARLOS FELIX', reg: '2-30050', unit: 'MOSSORO MOINHO', pos: 'TÉCNICO ELETRICISTA', sec: 'MANUTENÇÃO', func: '20295', adm: '2017-06-01', type: 'NORMAL' },
    // MOSSORO FRISCO
    { name: 'BRUNO GABRIEL MELO COSTA', reg: '2-40300', unit: 'MOSSORO FRISCO', pos: 'OPERADOR DE PRODUCAO I', sec: 'PRODUCAO', func: '20372', adm: '2023-04-17', type: 'NORMAL' },
    { name: 'AMANDA CRISTINA LIMA', reg: '2-40150', unit: 'MOSSORO FRISCO', pos: 'ANALISTA DE QUALIDADE', sec: 'QUALIDADE', func: '20520', adm: '2021-09-20', type: 'NORMAL' },
    { name: 'PEDRO AUGUSTO MENDES', reg: '2-40200', unit: 'MOSSORO FRISCO', pos: 'TÉCNICO DE MANUTENÇÃO SR', sec: 'MANUTENÇÃO', func: '20291', adm: '2019-12-10', type: 'NORMAL' },
    // SANTA LUZIA
    { name: 'DANIEL RODRIGUES SOARES', reg: '4-10100', unit: 'SANTA LUZIA', pos: 'OPERADOR DE PRODUCAO II', sec: 'TORREFACAO', func: '20373', adm: '2020-07-15', type: 'NORMAL' },
    { name: 'RENATA APARECIDA FERREIRA', reg: '4-10200', unit: 'SANTA LUZIA', pos: 'SUPERVISORA DE PRODUCAO', sec: 'PRODUCAO', func: '20600', adm: '2016-03-01', type: 'NORMAL' },
    // NATAL
    { name: 'FRANCISCO EDSON PEREIRA', reg: '2-20100', unit: 'NATAL', pos: 'OPERADOR DE PRODUCAO I', sec: 'PRODUCAO', func: '20372', adm: '2022-01-03', type: 'NORMAL' },
    { name: 'LUCIA MARIA CUNHA', reg: '2-20200', unit: 'NATAL', pos: 'ANALISTA DE MEIO AMBIENTE', sec: 'MEIO AMBIENTE', func: '20750', adm: '2018-06-15', type: 'NORMAL' },
    // RIO GRANDE DO SUL
    { name: 'ABEL MONTEIRO ANTUNES', reg: '10-50695', unit: 'RIO GRANDE DO SUL', pos: 'AUXILIAR DE EXPEDICAO', sec: 'SECAO DE ESTOQUE E EXPEDICAO', func: '20168', adm: '2023-01-02', type: 'NORMAL' },
    { name: 'BIANCA FERREIRA MARTINS', reg: '10-50400', unit: 'RIO GRANDE DO SUL', pos: 'OPERADORA DE PRODUCAO III', sec: 'EMPACOTAMENTO', func: '20374', adm: '2021-08-16', type: 'NORMAL' },
  ];

  for (const e of employees) {
    const uid = getUnitId(e.unit);
    insertEmp.run(e.name, e.reg, uid, e.pos, e.sec, e.func, e.adm, e.type);
  }

  // ── SAMPLE EVALUATIONS (from Excel data) ──────────────────────────────────
  const { calculateAchievedLevel, calculateGap } = require('./ranges');

  const insertEval = db.prepare(`
    INSERT INTO evaluations (evaluator_email, evaluator_name, evaluation_date, training_date, training_id, unit_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertCollab = db.prepare(`
    INSERT INTO eval_collaborators
      (evaluation_id, employee_id, employee_name, desired_level, achieved_level, total_questions, correct_answers, percentage, gap)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertAns = db.prepare(`
    INSERT INTO eval_answers (collaborator_id, question_id, question_text, answer)
    VALUES (?, ?, ?, ?)
  `);

  const getTrainingId = (namePart: string): number | null => {
    const r = db.prepare("SELECT id FROM trainings WHERE name LIKE ?").get(`%${namePart}%`) as { id: number } | undefined;
    return r?.id ?? null;
  };
  const getEmployeeId = (name: string): number | null => {
    const r = db.prepare("SELECT id FROM employees WHERE name = ?").get(name) as { id: number } | undefined;
    return r?.id ?? null;
  };

  // Eval 1: ANTONIO DIEGO - Meio Ambiente
  const t1 = getTrainingId('Mitigação Ambiental');
  const u1 = getUnitId('EUSEBIO FABRICA');
  if (t1 && u1) {
    const ev1 = insertEval.run('anacsantos@3coracoes.com.br', 'Ana Carolina Santos', '2026-05-26', '2026-05-07', t1, u1).lastInsertRowid as number;
    const emp1 = getEmployeeId('ANTONIO DIEGO DELFINO NUNES');
    const achieved1 = calculateAchievedLevel(4, 2);
    const pct1 = 4 > 0 ? 2 / 4 : 0;
    const gap1 = calculateGap('INTERDEPENDENTE', achieved1, pct1);
    const c1 = insertCollab.run(ev1, emp1, 'ANTONIO DIEGO DELFINO NUNES', 'INTERDEPENDENTE', achieved1, 4, 2, pct1, gap1).lastInsertRowid as number;
    const qs1 = db.prepare('SELECT tq.question_id, q.text FROM training_questions tq JOIN questions q ON q.id = tq.question_id WHERE tq.training_id = ?').all(t1) as { question_id: number; text: string }[];
    const answers1 = ['CONFORME', 'NAO_CONFORME', 'CONFORME', 'NAO_CONFORME'];
    qs1.slice(0, 4).forEach((q, i) => insertAns.run(c1, q.question_id, q.text, answers1[i] ?? 'CONFORME'));
  }

  // Eval 2: ALEX MAX - APPCC
  const t2 = getTrainingId('APPCC');
  const u2 = getUnitId('MOSSORO MOINHO');
  if (t2 && u2) {
    const ev2 = insertEval.run('anacsantos@3coracoes.com.br', 'Ana Carolina Santos', '2026-05-26', '2026-05-03', t2, u2).lastInsertRowid as number;
    const emp2 = getEmployeeId('ALEX MAX SILVA FERINO');
    const achieved2 = calculateAchievedLevel(2, 1);
    const pct2 = 0.5;
    const gap2 = calculateGap('DEPENDENTE', achieved2, pct2);
    const c2 = insertCollab.run(ev2, emp2, 'ALEX MAX SILVA FERINO', 'DEPENDENTE', achieved2, 2, 1, pct2, gap2).lastInsertRowid as number;
    const qs2 = db.prepare('SELECT tq.question_id, q.text FROM training_questions tq JOIN questions q ON q.id = tq.question_id WHERE tq.training_id = ?').all(t2) as { question_id: number; text: string }[];
    const answers2 = ['NAO_CONFORME', 'CONFORME'];
    qs2.slice(0, 2).forEach((q, i) => insertAns.run(c2, q.question_id, q.text, answers2[i] ?? 'CONFORME'));
  }

  // Eval 3: BRUNO GABRIEL - T.F Produção
  const t3 = getTrainingId('Manuseio de cafes');
  const u3 = getUnitId('MOSSORO FRISCO');
  if (t3 && u3) {
    const ev3 = insertEval.run('anacsantos@3coracoes.com.br', 'Ana Carolina Santos', '2026-05-27', '2026-05-13', t3, u3).lastInsertRowid as number;
    const emp3 = getEmployeeId('BRUNO GABRIEL MELO COSTA');
    const achieved3 = calculateAchievedLevel(5, 3);
    const pct3 = 0.6;
    const gap3 = calculateGap('DEPENDENTE', achieved3, pct3);
    const c3 = insertCollab.run(ev3, emp3, 'BRUNO GABRIEL MELO COSTA', 'DEPENDENTE', achieved3, 5, 3, pct3, gap3).lastInsertRowid as number;
    const qs3 = db.prepare('SELECT tq.question_id, q.text FROM training_questions tq JOIN questions q ON q.id = tq.question_id WHERE tq.training_id = ?').all(t3) as { question_id: number; text: string }[];
    const answers3 = ['CONFORME', 'NAO_CONFORME', 'CONFORME', 'CONFORME', 'CONFORME'];
    qs3.slice(0, 5).forEach((q, i) => insertAns.run(c3, q.question_id, q.text, answers3[i] ?? 'CONFORME'));
  }
}

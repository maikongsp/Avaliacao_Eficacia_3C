export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import * as XLSX from 'xlsx';

const HC_PASSWORD = 'Tres@2026';

// Exact column names from the HC / Detalhe15 file (uppercase for comparison)
const COL_ALIASES = {
  name:        ['COLABORADOR', 'NM_COLABORADOR', 'NOME', 'NOME DO COLABORADOR'],
  registration:['MATRICULA', 'MATRÍCULA', 'NR_MAT', 'NR. MAT', 'NR. MATRÍCULA'],
  unit:        ['UNIDADE', 'DS_UNIDADE', 'NM_UNIDADE', 'FILIAL', 'LOCAL'],
  position:    ['CARGO', 'DS_CARGO', 'FUNÇÃO', 'FUNCAO', 'DS_FUNCAO'],
  section:     ['SECAO', 'SEÇÃO', 'DS_SECAO', 'SETOR', 'DEPARTAMENTO'],
  funcCode:    ['COD SECAO', 'CENTRO DE CUSTO', 'COD_FUNCAO', 'DS_FUNCAO_COD'],
  admDate:     ['DATA DE ADMISSÃO', 'DATA DE ADMISSAO', 'DT_ADMISSAO', 'DT_ADMISSÃO', 'ADMISSÃO'],
  empType:     ['TIPO DE CONTRATO', 'TIPO', 'TP_VINCULO', 'VÍNCULO', 'VINCULO'],
  diretoria:   ['DIRETORIA'],
  regional:    ['REGIONAL'],
  filial:      ['FILIAL'],
};

function findColIdx(headers: string[], aliases: string[]): number {
  // Exact match first
  for (const alias of aliases) {
    const idx = headers.findIndex(h => h.toUpperCase().trim() === alias.toUpperCase().trim());
    if (idx >= 0) return idx;
  }
  // Partial match fallback
  for (const alias of aliases) {
    const idx = headers.findIndex(h => h.toUpperCase().trim().includes(alias.toUpperCase().trim()));
    if (idx >= 0) return idx;
  }
  return -1;
}

function normalizeDate(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === 'number') {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
  }
  if (val instanceof Date) {
    return val.toISOString().slice(0, 10);
  }
  if (typeof val === 'string') {
    const br = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (br) return `${br[3]}-${br[2].padStart(2,'0')}-${br[1].padStart(2,'0')}`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  }
  return null;
}

export async function POST(req: NextRequest) {
  let formData: FormData;
  try { formData = await req.formData(); }
  catch { return NextResponse.json({ error: 'Erro ao ler formulário' }, { status: 400 }); }

  const password = formData.get('password') as string | null;
  if (password !== HC_PASSWORD) {
    return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });
  }

  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  } catch {
    return NextResponse.json({ error: 'Arquivo Excel inválido ou corrompido' }, { status: 400 });
  }

  const sheetNames = workbook.SheetNames;

  // Resolve target sheet
  const targetSheet = (formData.get('sheet') as string | null)?.trim() ?? '';
  const normalize   = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

  let sheetName = sheetNames[0];
  if (targetSheet) {
    // Exact match or trimmed match
    sheetName = sheetNames.find(n => n.trim() === targetSheet.trim()) ?? sheetNames.find(n => normalize(n).includes(normalize(targetSheet))) ?? sheetName;
  } else {
    // Prefer "Detalhe15" or "HC Maio" automatically
    const det = sheetNames.find(n => normalize(n).startsWith('detalhe'));
    const hc  = sheetNames.find(n => normalize(n).startsWith('hc'));
    sheetName = det ?? hc ?? sheetNames[0];
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return NextResponse.json({ error: `Aba "${sheetName}" não encontrada` }, { status: 400 });

  // Parse to rows array
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false }) as unknown[][];
  if (raw.length < 2) return NextResponse.json({ error: 'Planilha sem dados' }, { status: 400 });

  // Find header row (first row with ≥ 5 non-empty cells)
  let headerIdx = 0;
  for (let i = 0; i < Math.min(10, raw.length); i++) {
    if ((raw[i] as unknown[]).filter(c => c !== null && c !== '').length >= 5) { headerIdx = i; break; }
  }
  const headers = (raw[headerIdx] as unknown[]).map(h => String(h ?? '').trim());

  const iName  = findColIdx(headers, COL_ALIASES.name);
  const iReg   = findColIdx(headers, COL_ALIASES.registration);
  const iUnit  = findColIdx(headers, COL_ALIASES.unit);
  const iPos   = findColIdx(headers, COL_ALIASES.position);
  const iSec   = findColIdx(headers, COL_ALIASES.section);
  const iFunc  = findColIdx(headers, COL_ALIASES.funcCode);
  const iAdm   = findColIdx(headers, COL_ALIASES.admDate);
  const iType  = findColIdx(headers, COL_ALIASES.empType);
  const iDir   = findColIdx(headers, COL_ALIASES.diretoria);
  const iReg2  = findColIdx(headers, COL_ALIASES.regional);
  const iFilial= findColIdx(headers, COL_ALIASES.filial);

  if (iName < 0) {
    return NextResponse.json({
      error: 'Coluna COLABORADOR/NOME não encontrada.',
      sheets: sheetNames,
      detectedHeaders: headers.slice(0, 20),
    }, { status: 400 });
  }

  // Filter mode from form
  const filterIndustrial = formData.get('filter_industrial') === '1';

  const db = getDb();

  // Unit cache: UPPER(name) → id
  const unitCache: Record<string, number | null> = {};
  function getOrCreateUnit(name: string, regional?: string, directorship?: string, filial?: string): number | null {
    if (!name) return null;
    const key = name.trim().toUpperCase();
    if (key in unitCache) return unitCache[key];
    const row = db.prepare('SELECT id FROM units WHERE UPPER(name) = ?').get(key) as { id: number } | undefined;
    if (row) { unitCache[key] = row.id; return row.id; }
    const res = db.prepare(
      'INSERT INTO units (name, region, directorship, branch) VALUES (?, ?, ?, ?)'
    ).run(name.trim(), regional ?? null, directorship ?? 'DIRETORIA INDUSTRIAL', filial ?? null);
    const newId = Number(res.lastInsertRowid);
    unitCache[key] = newId;
    return newId;
  }

  const findByReg  = db.prepare('SELECT id FROM employees WHERE registration = ?');
  const findByName = db.prepare('SELECT id FROM employees WHERE UPPER(name) = ? AND (unit_id = ? OR unit_id IS NULL) LIMIT 1');
  const insertEmp  = db.prepare(`
    INSERT INTO employees (name, registration, unit_id, position, section, function_code, admission_date, employment_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const updateEmp  = db.prepare(`
    UPDATE employees
    SET name=?, unit_id=?, position=?, section=?, function_code=?, admission_date=?, employment_type=?
    WHERE id=?
  `);

  let inserted = 0, updated = 0, skipped = 0;
  const errors: string[] = [];

  const importAll = db.transaction(() => {
    for (let i = headerIdx + 1; i < raw.length; i++) {
      const row = raw[i] as unknown[];
      const name = String(row[iName] ?? '').trim();
      if (!name) { skipped++; continue; }

      // Optional filter: only DIRETORIA INDUSTRIAL
      if (filterIndustrial && iDir >= 0) {
        const dir = String(row[iDir] ?? '').toUpperCase();
        if (!dir.includes('INDUSTRIAL')) { skipped++; continue; }
      }

      const reg     = iReg   >= 0 ? String(row[iReg]    ?? '').trim() : '';
      const unitNm  = iUnit  >= 0 ? String(row[iUnit]   ?? '').trim() : '';
      const pos     = iPos   >= 0 ? String(row[iPos]    ?? '').trim() : '';
      const sec     = iSec   >= 0 ? String(row[iSec]    ?? '').trim() : '';
      const func    = iFunc  >= 0 ? String(row[iFunc]   ?? '').trim() : '';
      const adm     = iAdm   >= 0 ? normalizeDate(row[iAdm]) : null;
      const type    = iType  >= 0 ? String(row[iType]   ?? '').trim() : '';
      const dir     = iDir   >= 0 ? String(row[iDir]    ?? '').trim() : '';
      const reg2    = iReg2  >= 0 ? String(row[iReg2]   ?? '').trim() : '';
      const filial  = iFilial>= 0 ? String(row[iFilial] ?? '').trim() : '';
      const unitId  = getOrCreateUnit(unitNm, reg2, dir || undefined, filial || undefined);

      try {
        let existingId: number | null = null;

        if (reg) {
          const found = findByReg.get(reg) as { id: number } | undefined;
          if (found) existingId = found.id;
        } else {
          const found = findByName.get(name.toUpperCase(), unitId) as { id: number } | undefined;
          if (found) existingId = found.id;
        }

        if (existingId) {
          updateEmp.run(name, unitId, pos || null, sec || null, func || null, adm, type || null, existingId);
          updated++;
        } else {
          insertEmp.run(name, reg || null, unitId, pos || null, sec || null, func || null, adm, type || null);
          inserted++;
        }
      } catch (e) {
        if (errors.length < 20) errors.push(`Linha ${i + 1} (${name}): ${(e as Error).message}`);
      }
    }
  });

  importAll();

  const total = await db.prepare('SELECT COUNT(*) as c FROM employees').get() as { c: number };

  return NextResponse.json({
    ok: true,
    sheet: sheetName,
    sheets: sheetNames,
    inserted,
    updated,
    skipped,
    errors,
    totalInDb: total.c,
    detectedColumns: {
      name:         iName   >= 0 ? headers[iName]   : null,
      registration: iReg    >= 0 ? headers[iReg]    : null,
      unit:         iUnit   >= 0 ? headers[iUnit]   : null,
      position:     iPos    >= 0 ? headers[iPos]    : null,
      section:      iSec    >= 0 ? headers[iSec]    : null,
      funcCode:     iFunc   >= 0 ? headers[iFunc]   : null,
      admDate:      iAdm    >= 0 ? headers[iAdm]    : null,
      empType:      iType   >= 0 ? headers[iType]   : null,
    },
  });
}

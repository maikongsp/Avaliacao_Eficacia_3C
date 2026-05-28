export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import * as XLSX from 'xlsx';

const HC_PASSWORD = 'Tres@2026';

// Flexible column name aliases (uppercase for comparison)
const COL = {
  registration: ['NR_MAT', 'MATRICULA', 'MATRÍCULA', 'NR. MATRÍCULA', 'NR MATRÍCULA', 'NUMERO_MATRICULA', 'NUMERO MATRICULA', 'NR_MATRICULA', 'NR. MAT', 'MAT'],
  name:         ['NM_COLABORADOR', 'NOME', 'NOME DO COLABORADOR', 'NM_FUNC', 'NM_FUNCIONARIO', 'FUNCIONARIO', 'COLABORADOR', 'NM COLABORADOR'],
  unit:         ['DS_UNIDADE', 'UNIDADE', 'NM_UNIDADE', 'PLANTA', 'LOCAL', 'FILIAL', 'DS_FILIAL'],
  position:     ['DS_CARGO', 'CARGO', 'NM_CARGO', 'FUNÇÃO', 'FUNCAO', 'DS_FUNCAO', 'NM_FUNCAO', 'CARGO/FUNÇÃO'],
  section:      ['DS_SECAO', 'SEÇÃO', 'SECAO', 'NM_SECAO', 'DEPARTAMENTO', 'AREA', 'ÁREA', 'DS_AREA'],
  funcCode:     ['DS_FUNCAO_COD', 'COD_FUNCAO', 'COD_CARGO', 'CODIGO_CARGO', 'CÓDIGO_CARGO', 'FUNC_COD', 'CODIGO FUNCAO', 'COD. CARGO'],
  admDate:      ['DT_ADMISSAO', 'DT_ADMISSÃO', 'ADMISSÃO', 'ADMISSAO', 'DATA ADMISSÃO', 'DATA_ADMISSAO', 'DT. ADMISSÃO', 'DT ADM'],
  empType:      ['TP_VINCULO', 'VÍNCULO', 'VINCULO', 'TIPO', 'TIPO_EMP', 'TP_EMP', 'TIPO FUNCIONARIO', 'DS_VINCULO'],
};

function findCol(headers: string[], aliases: string[]): number {
  for (const alias of aliases) {
    const idx = headers.findIndex(h => h.toUpperCase().trim() === alias);
    if (idx >= 0) return idx;
  }
  // partial match fallback
  for (const alias of aliases) {
    const idx = headers.findIndex(h => h.toUpperCase().trim().includes(alias));
    if (idx >= 0) return idx;
  }
  return -1;
}

function normalizeDate(val: unknown): string | null {
  if (!val) return null;
  // Excel date serial number
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) {
      const mm = String(d.m).padStart(2, '0');
      const dd = String(d.d).padStart(2, '0');
      return `${d.y}-${mm}-${dd}`;
    }
  }
  if (typeof val === 'string') {
    // dd/mm/yyyy
    const br = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (br) return `${br[3]}-${br[2]}-${br[1]}`;
    // yyyy-mm-dd passthrough
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  }
  return null;
}

export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Erro ao ler formulário' }, { status: 400 });
  }

  const password = formData.get('password') as string | null;
  if (password !== HC_PASSWORD) {
    return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });
  }

  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  } catch {
    return NextResponse.json({ error: 'Arquivo Excel inválido' }, { status: 400 });
  }

  const sheetNames = workbook.SheetNames;

  // Find "HC maio" sheet (case-insensitive, accent-insensitive)
  const normalize = (s: string) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

  const targetSheet = formData.get('sheet') as string | null;
  let sheetName = sheetNames[0]; // default to first
  if (targetSheet) {
    sheetName = targetSheet;
  } else {
    const hcSheet = sheetNames.find(n =>
      normalize(n).includes('hc') && normalize(n).includes('maio')
    ) ?? sheetNames.find(n => normalize(n).startsWith('hc'));
    if (hcSheet) sheetName = hcSheet;
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return NextResponse.json({ error: `Aba "${sheetName}" não encontrada` }, { status: 400 });

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];
  if (rows.length < 2) return NextResponse.json({ error: 'Planilha sem dados' }, { status: 400 });

  // Find header row (first row with enough non-empty cells)
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const r = rows[i] as unknown[];
    if (r.filter(c => c !== '').length >= 4) { headerRowIdx = i; break; }
  }

  const headers = (rows[headerRowIdx] as unknown[]).map(h => String(h ?? ''));

  const iReg  = findCol(headers, COL.registration);
  const iName = findCol(headers, COL.name);
  const iUnit = findCol(headers, COL.unit);
  const iPos  = findCol(headers, COL.position);
  const iSec  = findCol(headers, COL.section);
  const iFunc = findCol(headers, COL.funcCode);
  const iAdm  = findCol(headers, COL.admDate);
  const iType = findCol(headers, COL.empType);

  if (iName < 0) {
    return NextResponse.json({
      error: 'Coluna de nome não encontrada. Colunas detectadas: ' + headers.join(', '),
      sheets: sheetNames,
    }, { status: 400 });
  }

  const db = getDb();

  // Get or create unit
  const unitCache: Record<string, number | null> = {};
  function getOrCreateUnit(name: string): number | null {
    if (!name) return null;
    const key = name.trim().toUpperCase();
    if (key in unitCache) return unitCache[key];
    const row = db.prepare('SELECT id FROM units WHERE UPPER(name) = ?').get(key) as { id: number } | undefined;
    if (row) { unitCache[key] = row.id; return row.id; }
    // Create new unit
    const res = db.prepare(
      "INSERT INTO units (name, directorship) VALUES (?, 'DIRETORIA INDUSTRIAL')"
    ).run(name.trim());
    const newId = res.lastInsertRowid as number;
    unitCache[key] = newId;
    return newId;
  }

  const findEmp = db.prepare('SELECT id FROM employees WHERE registration = ?');
  const insertEmp = db.prepare(`
    INSERT INTO employees (name, registration, unit_id, position, section, function_code, admission_date, employment_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const updateEmp = db.prepare(`
    UPDATE employees SET name=?, unit_id=?, position=?, section=?, function_code=?, admission_date=?, employment_type=?
    WHERE registration=?
  `);

  let inserted = 0, updated = 0, skipped = 0;
  const errors: string[] = [];

  const importRows = db.transaction(() => {
    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const row = rows[i] as unknown[];
      const name = String(row[iName] ?? '').trim();
      if (!name) { skipped++; continue; }

      const reg     = iReg  >= 0 ? String(row[iReg]  ?? '').trim() : '';
      const unitNm  = iUnit >= 0 ? String(row[iUnit] ?? '').trim() : '';
      const pos     = iPos  >= 0 ? String(row[iPos]  ?? '').trim() : '';
      const sec     = iSec  >= 0 ? String(row[iSec]  ?? '').trim() : '';
      const func    = iFunc >= 0 ? String(row[iFunc] ?? '').trim() : '';
      const adm     = iAdm  >= 0 ? normalizeDate(row[iAdm]) : null;
      const type    = iType >= 0 ? String(row[iType] ?? '').trim() : '';
      const unitId  = getOrCreateUnit(unitNm);

      try {
        if (reg) {
          const existing = findEmp.get(reg) as { id: number } | undefined;
          if (existing) {
            updateEmp.run(name, unitId, pos || null, sec || null, func || null, adm, type || null, reg);
            updated++;
          } else {
            insertEmp.run(name, reg || null, unitId, pos || null, sec || null, func || null, adm, type || null);
            inserted++;
          }
        } else {
          insertEmp.run(name, null, unitId, pos || null, sec || null, func || null, adm, type || null);
          inserted++;
        }
      } catch (e) {
        errors.push(`Linha ${i + 1}: ${(e as Error).message}`);
      }
    }
  });

  importRows();

  return NextResponse.json({
    ok: true,
    sheet: sheetName,
    sheets: sheetNames,
    inserted,
    updated,
    skipped,
    errors: errors.slice(0, 20),
    detectedColumns: {
      registration: iReg  >= 0 ? headers[iReg]  : null,
      name:         iName >= 0 ? headers[iName] : null,
      unit:         iUnit >= 0 ? headers[iUnit] : null,
      position:     iPos  >= 0 ? headers[iPos]  : null,
      section:      iSec  >= 0 ? headers[iSec]  : null,
      funcCode:     iFunc >= 0 ? headers[iFunc] : null,
      admDate:      iAdm  >= 0 ? headers[iAdm]  : null,
      empType:      iType >= 0 ? headers[iType] : null,
    },
  });
}

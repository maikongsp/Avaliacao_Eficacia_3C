export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb, DbClient } from '@/lib/db';
import * as XLSX from 'xlsx';

const HC_PASSWORD = 'Tres@2026';

const COL_ALIASES = {
  name:        ['COLABORADOR', 'NM_COLABORADOR', 'NOME', 'NOME DO COLABORADOR'],
  registration:['MATRICULA', 'MATRÍCULA', 'NR_MAT', 'NR. MAT', 'NR. MATRÍCULA'],
  unit:        ['UNIDADE', 'DS_UNIDADE', 'NM_UNIDADE', 'LOCAL'],
  // In HC Oficial: CARGO = job title; FUNÇÃO = numeric code (not position label)
  position:    ['CARGO', 'DS_CARGO', 'DS_FUNCAO'],
  section:     ['SECAO', 'SEÇÃO', 'DS_SECAO', 'SETOR', 'DEPARTAMENTO'],
  // In HC Oficial: FUNÇÃO holds the numeric function code (e.g. 20499)
  funcCode:    ['FUNÇÃO', 'FUNCAO', 'COD SECAO', 'CENTRO DE CUSTO', 'COD_FUNCAO', 'DS_FUNCAO_COD'],
  admDate:     ['DATA DE ADMISSÃO', 'DATA DE ADMISSAO', 'DT_ADMISSAO', 'DT_ADMISSÃO', 'ADMISSÃO'],
  // TIPO (NORMAL/ESTAGIARIO/APRENDIZ) takes priority over TIPO DE CONTRATO (QLP)
  empType:     ['TIPO', 'TIPO DE CONTRATO', 'TP_VINCULO', 'VÍNCULO', 'VINCULO'],
  diretoria:   ['DIRETORIA'],
  regional:    ['REGIONAL'],
  filial:      ['FILIAL'],
  tipoNegocio: ['TIPO DE NEGOCIO', 'TIPO DE NEGÓCIO'],
  situacao:    ['SITUAÇÃO', 'SITUACAO', 'SITUACÃO'],
};

function findColIdx(headers: string[], aliases: string[]): number {
  for (const alias of aliases) {
    const idx = headers.findIndex(h => h.toUpperCase().trim() === alias.toUpperCase().trim());
    if (idx >= 0) return idx;
  }
  for (const alias of aliases) {
    const idx = headers.findIndex(h => h.toUpperCase().trim().includes(alias.toUpperCase().trim()));
    if (idx >= 0) return idx;
  }
  return -1;
}

function normalizeDate(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  if (typeof val === 'string') {
    const br = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (br) return `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  }
  return null;
}

function cleanStr(val: unknown): string {
  return String(val ?? '').replace(/[\r\n\t]/g, ' ').trim();
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
  const targetSheet = (formData.get('sheet') as string | null)?.trim() ?? '';
  const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

  let sheetName = sheetNames[0];
  if (targetSheet) {
    sheetName =
      sheetNames.find(n => n.trim() === targetSheet.trim()) ??
      sheetNames.find(n => normalize(n).includes(normalize(targetSheet))) ??
      sheetName;
  } else {
    // Priority: 'HC Oficial' > starts with 'HC' > starts with 'Detalhe'
    const hcOficial = sheetNames.find(n => normalize(n) === 'hc oficial');
    const hcAny     = sheetNames.find(n => normalize(n).startsWith('hc'));
    const det       = sheetNames.find(n => normalize(n).startsWith('detalhe'));
    sheetName = hcOficial ?? det ?? hcAny ?? sheetNames[0];
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return NextResponse.json({ error: `Aba "${sheetName}" não encontrada` }, { status: 400 });

  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false }) as unknown[][];
  if (raw.length < 2) return NextResponse.json({ error: 'Planilha sem dados' }, { status: 400 });

  let headerIdx = 0;
  for (let i = 0; i < Math.min(10, raw.length); i++) {
    if ((raw[i] as unknown[]).filter(c => c !== null && c !== '').length >= 5) {
      headerIdx = i;
      break;
    }
  }
  const headers = (raw[headerIdx] as unknown[]).map(h => String(h ?? '').trim());

  const iName     = findColIdx(headers, COL_ALIASES.name);
  const iReg      = findColIdx(headers, COL_ALIASES.registration);
  const iUnit     = findColIdx(headers, COL_ALIASES.unit);
  const iPos      = findColIdx(headers, COL_ALIASES.position);
  const iSec      = findColIdx(headers, COL_ALIASES.section);
  const iFunc     = findColIdx(headers, COL_ALIASES.funcCode);
  const iAdm      = findColIdx(headers, COL_ALIASES.admDate);
  const iType     = findColIdx(headers, COL_ALIASES.empType);
  const iDir      = findColIdx(headers, COL_ALIASES.diretoria);
  const iReg2     = findColIdx(headers, COL_ALIASES.regional);
  const iFilial   = findColIdx(headers, COL_ALIASES.filial);
  const iTipoNeg  = findColIdx(headers, COL_ALIASES.tipoNegocio);
  const iSituacao = findColIdx(headers, COL_ALIASES.situacao);

  if (iName < 0) {
    return NextResponse.json({
      error: 'Coluna COLABORADOR/NOME não encontrada.',
      sheets: sheetNames,
      detectedHeaders: headers.slice(0, 20),
    }, { status: 400 });
  }

  // Filter options
  const filterFabrica  = formData.get('filter_industrial') === '1';
  const filterAtivos   = formData.get('filter_ativos')     === '1';

  const db = await getDb();

  const unitCache: Record<string, number | null> = {};
  async function getOrCreateUnit(
    tx: DbClient,
    name: string,
    regional?: string,
    directorship?: string,
    filial?: string,
  ): Promise<number | null> {
    if (!name || name.trim() === '' || name.trim() === '-') return null;
    const key = name.trim().toUpperCase();
    if (key in unitCache) return unitCache[key];
    const row = await tx.get<{ id: number }>('SELECT id FROM units WHERE UPPER(name) = ?', [key]);
    if (row) {
      // Update region/directorship/filial if they changed
      if (regional || directorship || filial) {
        await tx.run(
          `UPDATE units SET region = COALESCE(?, region), directorship = COALESCE(?, directorship), branch = COALESCE(?, branch) WHERE id = ?`,
          [regional ?? null, directorship ?? null, filial ?? null, row.id]
        );
      }
      unitCache[key] = row.id;
      return row.id;
    }
    const res = await tx.run(
      'INSERT INTO units (name, region, directorship, branch) VALUES (?, ?, ?, ?)',
      [name.trim(), regional ?? null, directorship ?? null, filial ?? null]
    );
    const newId = res.lastInsertRowid;
    unitCache[key] = newId;
    return newId;
  }

  let inserted = 0, updated = 0, skipped = 0;
  const errors: string[] = [];

  await db.transaction(async (tx) => {
    for (let i = headerIdx + 1; i < raw.length; i++) {
      const row = raw[i] as unknown[];
      const name = cleanStr(row[iName]);
      if (!name) { skipped++; continue; }

      // Filter: somente ativos (SITUAÇÃO = 'A')
      if (filterAtivos && iSituacao >= 0) {
        const sit = cleanStr(row[iSituacao]).toUpperCase();
        if (sit !== 'A' && sit !== 'ATIVO') { skipped++; continue; }
      }

      // Filter: somente Fábrica
      if (filterFabrica) {
        if (iTipoNeg >= 0) {
          // HC Oficial format: use TIPO DE NEGOCIO = FABRICA
          const tNeg = cleanStr(row[iTipoNeg]).toUpperCase();
          if (tNeg !== 'FABRICA') { skipped++; continue; }
        } else if (iDir >= 0) {
          // Legacy format: DIRETORIA contains INDUSTRIAL
          const dir = cleanStr(row[iDir]).toUpperCase();
          if (!dir.includes('INDUSTRIAL')) { skipped++; continue; }
        }
      }

      const reg    = iReg    >= 0 ? cleanStr(row[iReg])    : '';
      const unitNm = iUnit   >= 0 ? cleanStr(row[iUnit])   : '';
      const pos    = iPos    >= 0 ? cleanStr(row[iPos])    : '';
      const sec    = iSec    >= 0 ? cleanStr(row[iSec])    : '';
      const func   = iFunc   >= 0 ? cleanStr(row[iFunc])   : '';
      const adm    = iAdm    >= 0 ? normalizeDate(row[iAdm]) : null;
      const type   = iType   >= 0 ? cleanStr(row[iType])   : '';
      const dir    = iDir    >= 0 ? cleanStr(row[iDir])    : '';
      const reg2   = iReg2   >= 0 ? cleanStr(row[iReg2])   : '';
      const filial = iFilial >= 0 ? cleanStr(row[iFilial]) : '';

      const unitId = await getOrCreateUnit(tx, unitNm, reg2 || undefined, dir || undefined, filial || undefined);

      try {
        let existingId: number | null = null;

        if (reg) {
          const found = await tx.get<{ id: number }>('SELECT id FROM employees WHERE registration = ?', [reg]);
          if (found) existingId = found.id;
        } else {
          const found = await tx.get<{ id: number }>(
            'SELECT id FROM employees WHERE UPPER(name) = ? AND (unit_id = ? OR unit_id IS NULL) LIMIT 1',
            [name.toUpperCase(), unitId]
          );
          if (found) existingId = found.id;
        }

        if (existingId) {
          await tx.run(
            `UPDATE employees SET name=?, registration=?, unit_id=?, position=?, section=?, function_code=?, admission_date=?, employment_type=? WHERE id=?`,
            [name, reg || null, unitId, pos || null, sec || null, func || null, adm, type || null, existingId]
          );
          updated++;
        } else {
          await tx.run(
            `INSERT INTO employees (name, registration, unit_id, position, section, function_code, admission_date, employment_type)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, reg || null, unitId, pos || null, sec || null, func || null, adm, type || null]
          );
          inserted++;
        }
      } catch (e) {
        if (errors.length < 20) errors.push(`Linha ${i + 1} (${name}): ${(e as Error).message}`);
      }
    }
  });

  const total = await db.get<{ c: number }>('SELECT COUNT(*) as c FROM employees');

  return NextResponse.json({
    ok: true,
    sheet: sheetName,
    sheets: sheetNames,
    inserted,
    updated,
    skipped,
    errors,
    totalInDb: total?.c ?? 0,
    detectedColumns: {
      name:         iName     >= 0 ? headers[iName]     : null,
      registration: iReg      >= 0 ? headers[iReg]      : null,
      unit:         iUnit     >= 0 ? headers[iUnit]      : null,
      position:     iPos      >= 0 ? headers[iPos]       : null,
      section:      iSec      >= 0 ? headers[iSec]       : null,
      funcCode:     iFunc     >= 0 ? headers[iFunc]      : null,
      admDate:      iAdm      >= 0 ? headers[iAdm]       : null,
      empType:      iType     >= 0 ? headers[iType]      : null,
      tipoNegocio:  iTipoNeg  >= 0 ? headers[iTipoNeg]   : null,
      situacao:     iSituacao >= 0 ? headers[iSituacao]  : null,
    },
  });
}

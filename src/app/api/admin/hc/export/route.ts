export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import * as XLSX from 'xlsx';

const HC_PASSWORD = 'Tres@2026';

const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { password?: string };
  if (body.password !== HC_PASSWORD) {
    return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });
  }

  const db = await getDb();

  const employees = await db.all<Record<string, string | null>>(`
    SELECT
      e.registration   AS "NR_MAT",
      e.name           AS "NM_COLABORADOR",
      u.name           AS "DS_UNIDADE",
      e.position       AS "DS_CARGO",
      e.section        AS "DS_SECAO",
      e.function_code  AS "DS_FUNCAO_COD",
      e.admission_date AS "DT_ADMISSAO",
      e.employment_type AS "TP_VINCULO"
    FROM employees e
    LEFT JOIN units u ON u.id = e.unit_id
    ORDER BY u.name, e.name
  `);

  const now = new Date();
  const sheetName = `HC ${MONTHS_PT[now.getMonth()]}`;

  const wb = XLSX.utils.book_new();

  const hcRows = employees.map(e => ({
    NR_MAT:          e['NR_MAT']          ?? '',
    NM_COLABORADOR:  e['NM_COLABORADOR']  ?? '',
    DS_UNIDADE:      e['DS_UNIDADE']      ?? '',
    DS_CARGO:        e['DS_CARGO']        ?? '',
    DS_SECAO:        e['DS_SECAO']        ?? '',
    DS_FUNCAO_COD:   e['DS_FUNCAO_COD']   ?? '',
    DT_ADMISSAO:     e['DT_ADMISSAO']     ?? '',
    TP_VINCULO:      e['TP_VINCULO']      ?? '',
  }));

  const wsHC = XLSX.utils.json_to_sheet(hcRows);
  wsHC['!cols'] = [
    { wch: 14 }, { wch: 40 }, { wch: 28 }, { wch: 35 },
    { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, wsHC, sheetName);

  const unitMap: Record<string, { total: number }> = {};
  for (const e of employees) {
    const u = e['DS_UNIDADE'] ?? 'SEM UNIDADE';
    if (!unitMap[u]) unitMap[u] = { total: 0 };
    unitMap[u].total++;
  }

  const detRows = [
    { UNIDADE: 'DIRETORIA INDUSTRIAL', TOTAL_COLABORADORES: employees.length, EXPORTADO_EM: new Date().toLocaleDateString('pt-BR') },
    {},
    ...Object.entries(unitMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([unit, d]) => ({ UNIDADE: unit, TOTAL_COLABORADORES: d.total })),
  ];

  const wsDet = XLSX.utils.json_to_sheet(detRows);
  wsDet['!cols'] = [{ wch: 35 }, { wch: 22 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsDet, 'Detalhe15-Diretoria Industrial');

  const buf = Buffer.from(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer);
  const filename = `HC_DiretoriaIndustrial_${now.getFullYear()}_${String(now.getMonth()+1).padStart(2,'0')}.xlsx`;

  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

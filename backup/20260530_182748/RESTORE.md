# Guia de Restore do Backup

## Arquivos incluídos
- `hc_colaboradores.xlsx` — 9038 colaboradores (pode ser reimportado via /admin/hc)
- `avaliacoes.json` — lista das avaliações
- `avaliacoes_detalhes.json` — avaliações com colaboradores e respostas
- `unidades.json` — todas as unidades cadastradas
- `planos.json` — planos de ação
- `codigo_fonte.tar.gz` — snapshot completo do código-fonte

## Para reimportar colaboradores
1. Acesse `/admin/hc` no sistema
2. Informe a senha `Tres@2026`
3. Faça upload do arquivo `hc_colaboradores.xlsx`
4. Clique em "Importar Colaboradores"

## Problema de persistência (Railway)
O banco de dados está sendo resetado a cada deploy porque o volume Railway
não está sendo montado corretamente em `/data`.

**Verifique no painel Railway:**
1. Em "Volumes", confirme que o volume `teste-ia-volume` existe
2. Em "Settings" do serviço, confirme que o volume está montado em `/data`
3. Confirme que a variável `DATA_DIR=/data` está definida nas variáveis do serviço

O `railway.toml` já define `DATA_DIR=/data` — se o volume estiver montado corretamente,
os dados persistirão entre deploys.

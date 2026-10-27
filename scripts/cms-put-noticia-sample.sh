#!/usr/bin/env bash
# Exemplo: PUT landing com resumo longo (requer cookie de admin).
# Uso: BASE=https://www.sindesgv.com.br COOKIE='sindes_admin=...' ./scripts/cms-put-noticia-sample.sh
set -euo pipefail
BASE="${BASE:-http://127.0.0.1:43123}"
RESUMO="$(printf 'Presidência 🏥\n\n%s' "$(head -c 800 /dev/zero | tr '\0' 'a')")"
payload=$(node -e "
const resumo = process.env.RESUMO;
console.log(JSON.stringify({
  noticias: [{
    titulo: 'Teste resumo colado',
    resumo,
    data: '2026',
    tipo: 'presidencia',
    href: 'https://www.instagram.com/sindesgv/',
    confirmar: true
  }],
  destaquesCct: [],
  conquistasLinhaDoTempo: [],
  depoimentos: [],
  impactStats: [{ valor: '1', rotulo: 'Teste', confirmar: true }],
  atualizadoEm: ''
}));
")
RESUMO="$RESUMO" payload="$payload" curl -sS -o /tmp/cms-put.out -w "%{http_code}" \
  -X PUT "$BASE/api/admin/cms/landing" \
  -H "content-type: application/json" \
  ${COOKIE:+-H "cookie: $COOKIE"} \
  -d "$payload" | tee /tmp/cms-put.code
echo
cat /tmp/cms-put.out | head -c 400
echo

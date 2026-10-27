#!/usr/bin/env bash
# Deploy idempotente do SINDES na VPS (Hostinger/Ubuntu).
# Uso: ./scripts/deploy-hostinger.sh
# Execute a partir da raiz do repositório (/var/www/sindes).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

APP_NAME="${PM2_APP_NAME:-sindes}"
BRANCH="${DEPLOY_BRANCH:-cursor/sindes-deploy-producao}"
PORT="${PORT:-3000}"

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Erro: '$1' não encontrado no PATH." >&2
    exit 1
  }
}

need git
need npm
need node

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [[ "$NODE_MAJOR" -lt 20 ]]; then
  echo "Erro: Node 20+ necessário (atual: $(node -v))." >&2
  exit 1
fi

if [[ ! -f .env.local ]]; then
  echo "Aviso: .env.local não encontrado. Copie de .env.example e configure antes do go-live." >&2
fi

mkdir -p data/validacao-trabalhador data/parceiros

if [[ -d .git ]]; then
  git fetch origin
  git checkout "$BRANCH"
  git pull origin "$BRANCH"
fi

npm ci
npm run build

if command -v pm2 >/dev/null 2>&1; then
  if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
    pm2 restart "$APP_NAME"
  else
    pm2 start npm --name "$APP_NAME" -- start -- -H 0.0.0.0 -p "$PORT"
    pm2 save
  fi
  pm2 status "$APP_NAME"
else
  echo "PM2 não instalado. Build concluído; inicie manualmente: npm start -- -H 0.0.0.0 -p $PORT" >&2
fi

echo "Deploy concluído em $(date -u +"%Y-%m-%dT%H:%M:%SZ")."

# Deploy do SINDES na VPS Hostinger (Ubuntu)

Este roteiro publica a aplicação Next.js do SINDES em uma VPS Ubuntu na Hostinger, com **nginx** na frente e **PM2** mantendo o processo Node. O DNS no Registro.br é configurado separadamente — veja [dns-registro-br.md](./dns-registro-br.md).

**Branch de produção:** `cursor/sindes-deploy-producao` (ou a branch acordada com a equipe).

**Domínios:** `sindesgv.com.br` e `www.sindesgv.com.br`.

---

## 1. Pré-requisitos

- VPS Ubuntu 22.04 ou 24.04 (Hostinger: hPanel → VPS → criar/acessar a máquina).
- Acesso **SSH** como usuário com `sudo` (chave SSH recomendada; não commitar senhas no repositório).
- **IPv4 público** da VPS anotado (usado no DNS e no certificado).
- Repositório Git acessível a partir da VPS (HTTPS ou deploy key).
- Variáveis de ambiente definidas **somente** em `.env.local` no servidor (nunca no Git).

---

## 2. Primeiro acesso à VPS

```bash
ssh SEU_USUARIO@SEU_IP_VPS
```

Atualize o sistema:

```bash
sudo apt update && sudo apt upgrade -y
```

---

## 3. Node.js 20 ou superior

Instale Node 20 LTS (exemplo com NodeSource):

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs build-essential
node -v   # deve ser v20.x ou superior
npm -v
```

---

## 4. Usuário de deploy e diretório da aplicação

Exemplo com usuário dedicado `sindes`:

```bash
sudo adduser --disabled-password --gecos "" sindes
sudo usermod -aG sudo sindes   # opcional; ou use apenas o usuário root/admin da VPS
sudo mkdir -p /var/www/sindes
sudo chown sindes:sindes /var/www/sindes
```

Como `sindes` (ou seu usuário):

```bash
cd /var/www/sindes
git clone URL_DO_REPOSITORIO .
git checkout cursor/sindes-deploy-producao
```

Atualizações futuras:

```bash
cd /var/www/sindes
git fetch origin
git checkout cursor/sindes-deploy-producao
git pull origin cursor/sindes-deploy-producao
```

---

## 5. Variáveis de ambiente (`.env.local`)

Copie o modelo e edite **no servidor**:

```bash
cp .env.example .env.local
nano .env.local
```

Preencha pelo menos:

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `ASSESSORIA_CODIGO` | Sim | Código de acesso à área `/assessoria` |
| `ADMIN_CODIGO` | Sim | Código de acesso à área `/admin` |
| `OPENAI_API_KEY` | Opcional* | Leitura de TRCT via OpenAI |
| `ANTHROPIC_API_KEY` | Opcional* | Leitura de TRCT via Anthropic |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Opcional | JSON da conta de serviço (inline) |
| `GOOGLE_SERVICE_ACCOUNT_JSON_PATH` | Opcional | Caminho no servidor para o JSON |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Opcional | Planilha de gestão |

\* Pelo menos uma chave de IA é necessária se a calculadora com upload de TRCT for usada em produção.

O arquivo `.env.local` está no `.gitignore` — **não** faça commit dele.

---

## 6. Pasta `data/` (persistência local)

A aplicação grava JSON e uploads em `data/` (atendimentos, convênios, validações, etc.). Esses caminhos estão no `.gitignore`; a pasta **não** vem do Git.

Na primeira instalação:

```bash
mkdir -p data/validacao-trabalhador data/parceiros
chmod 750 data
```

Faça backup periódico de `/var/www/sindes/data` (snapshot da VPS ou `rsync`).

---

## 7. Build da aplicação

```bash
cd /var/www/sindes
npm ci
npm run build
```

Se o build falhar, corrija erros de TypeScript ou dependências antes de subir o PM2.

---

## 8. PM2 (Next.js na porta 3000)

Instale o PM2 globalmente:

```bash
sudo npm install -g pm2
```

Inicie o Next em produção escutando em **3000** (nginx fará o proxy):

```bash
cd /var/www/sindes
pm2 start npm --name sindes -- start -- -H 0.0.0.0 -p 3000
pm2 save
pm2 startup   # siga a linha que o comando imprimir (sudo ...)
```

Comandos úteis:

```bash
pm2 status
pm2 logs sindes
pm2 restart sindes
```

Após cada `git pull` + build:

```bash
npm ci && npm run build && pm2 restart sindes
```

(O script opcional `scripts/deploy-hostinger.sh` automatiza esse fluxo.)

---

## 9. nginx (proxy reverso)

Instale e habilite:

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
```

Crie o site (substitua domínios se necessário):

```bash
sudo nano /etc/nginx/sites-available/sindes
```

Conteúdo sugerido **antes** do HTTPS (só HTTP, para o Certbot):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name sindesgv.com.br www.sindesgv.com.br;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 12m;
    }
}
```

Ative e teste:

```bash
sudo ln -sf /etc/nginx/sites-available/sindes /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 10. Certificado TLS (Certbot)

Com os registros DNS apontando para a VPS (veja [dns-registro-br.md](./dns-registro-br.md)):

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d sindesgv.com.br -d www.sindesgv.com.br
```

Renovação automática:

```bash
sudo certbot renew --dry-run
```

---

## 11. Firewall (80 e 443)

Com UFW:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

Não é necessário expor a porta **3000** publicamente; apenas localhost/nginx.

---

## 12. Health check

Na VPS:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/
```

Esperado: `200` (ou `307`/`308` se houver redirecionamento interno).

Pela internet (após DNS e HTTPS):

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://www.sindesgv.com.br/
```

Teste também a home e uma rota estática conhecida, por exemplo `/portal` ou `/privacidade`.

---

## 13. Ordem recomendada no go-live

1. Subir VPS, Node, clone, `.env.local`, `data/`, build e PM2.
2. Configurar nginx (HTTP) e validar `curl` local na 3000.
3. Ajustar DNS no Registro.br para o IPv4 da VPS.
4. Aguardar propagação DNS (minutos a algumas horas).
5. Rodar Certbot para `sindesgv.com.br` e `www.sindesgv.com.br`.
6. Validar HTTPS e fluxos críticos (portal, assessoria com código, admin).

---

## 14. Problemas comuns

| Sintoma | Verificação |
|---------|-------------|
| 502 Bad Gateway | `pm2 status`, logs do `sindes`, porta 3000 |
| 401 nas áreas restritas | `ASSESSORIA_CODIGO` / `ADMIN_CODIGO` em `.env.local` |
| 503 no TRCT | `OPENAI_API_KEY` ou `ANTHROPIC_API_KEY` |
| Certbot falha | DNS ainda não aponta para a VPS; confira com `dig sindesgv.com.br +short` |
| Permissão em `data/` | dono do processo PM2 deve poder escrever em `data/` |

---

## 15. Referências no repositório

- `.env.example` — lista completa de variáveis
- `README.md` — visão geral da aplicação
- [dns-registro-br.md](./dns-registro-br.md) — apontamento do domínio

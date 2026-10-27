# DNS no Registro.br — sindesgv.com.br / www.sindesgv.com.br

Este documento descreve **exatamente** o que configurar na interface do Registro.br quando a VPS Hostinger estiver pronta. **Não altere o DNS** até ter o **IPv4 público** real da VPS (placeholder abaixo: `SEU_IP_VPS`).

**Importante:** senhas, chaves de oito dígitos e tokens **não** devem ser salvas em arquivos do repositório. Quem for operar o painel deve tê-los em canal seguro.

---

## Situação atual (baseline do projeto)

Conforme levantamento em outubro/2026:

- **Registrador:** Registro.br  
- **Domínio:** `sindesgv.com.br` (situação publicada)  
- **Servidores DNS:** permanecem os do Registro.br — **não migrar** para Hostinger neste plano:
  - `a.auto.dns.br`
  - `b.auto.dns.br`
- **Endereço do site:** campo **vazio** (sem IP pré-preenchido pelo Registro.br)
- **Zona DNS:** sem registro **A**, **AAAA** ou **CNAME** no apex; **`www` ainda não está na zona**

O site público desejado é **`https://www.sindesgv.com.br`**, com o apex **`sindesgv.com.br`** apontando para o mesmo servidor.

---

## O que você precisa antes de clicar

1. **IPv4 público da VPS** — substitua `SEU_IP_VPS` em todos os passos (ex.: `203.0.113.50`).
2. **Acesso ao Registro.br** — usuário da conta do titular (ex.: usuário tipo `EDMCR68`, conforme cadastro).
3. **Chave de confirmação** — se o painel pedir, use a chave de **8 dígitos** enviada ao e-mail cadastrado na conta (ex.: caixa que começa com `crispimgv@…`). Peça uma chave nova se a anterior expirou; **não** documente a chave no Git.

---

## Manter servidores DNS do Registro.br

1. Acesse [https://registro.br](https://registro.br) e faça login.
2. Menu **Meus domínios** (ou equivalente na home logada).
3. Clique em **`sindesgv.com.br`**.
4. Localize a seção **DNS** / **Servidores DNS**.
5. Confirme que estão apenas:
   - `a.auto.dns.br`
   - `b.auto.dns.br`
6. **Não** preencha “usar DNS externo” com nameservers da Hostinger, a menos que a equipe decida mudar de estratégia por escrito.

O campo **Endereço do site** ( quando aparece vazio na ficha do domínio ) pode continuar **vazio** se você gerenciar os registros pela **Editar zona** — o que este roteiro recomenda para A + www + Certbot.

---

## Editar a zona DNS (registros A)

1. Na página do domínio **`sindesgv.com.br`**, em **DNS**, clique em **Editar zona** (ou **Configurar zona DNS** / **Modo avançado**, conforme o rótulo atual do Registro.br).
2. Se solicitada confirmação por **chave de 8 dígitos**, informe a chave recebida no e-mail do titular.

### Registro A — apex (`sindesgv.com.br`)

Adicione ou edite um registro:

| Campo | Valor |
|--------|--------|
| **Nome** / **Host** | `@` ou vazio (apex / raiz do domínio) |
| **Tipo** | `A` |
| **Destino** / **Dados** / **Valor** | `SEU_IP_VPS` |
| **TTL** | padrão do painel (ex.: 3600) |

Salve a linha.

### Registro para `www`

Prefira **A** apontando direto para a VPS (mesmo IP do apex):

| Campo | Valor |
|--------|--------|
| **Nome** / **Host** | `www` |
| **Tipo** | `A` |
| **Destino** / **Dados** | `SEU_IP_VPS` |
| **TTL** | padrão |

**Alternativa (se a zona aceitar CNAME para www):**

| Campo | Valor |
|--------|--------|
| **Nome** | `www` |
| **Tipo** | `CNAME` |
| **Destino** | `sindesgv.com.br.` (com ponto final, se o painel exigir FQDN) |

Se o Registro.br **não** permitir CNAME em `www` junto com outros registros no apex, use **A** com o mesmo IP — é o caminho mais simples com nginx + Certbot nos dois nomes.

3. **Salvar** / **Publicar** a zona e aguarde a confirmação na tela.

---

## Propagação DNS

- Alterações no Registro.br costumam refletir em **15 minutos a 4 horas**; em casos raros, até **48 horas**.
- Verifique de uma máquina externa:

```bash
dig sindesgv.com.br A +short
dig www.sindesgv.com.br A +short
```

Ambos devem retornar `SEU_IP_VPS` (ou o CNAME resolvendo para esse IP).

Só depois disso rode o **Certbot** na VPS (ver [deploy-hostinger.md](./deploy-hostinger.md)).

---

## O que **não** fazer neste roteiro

- Não trocar servidores DNS para a Hostinger sem alinhar com a equipe.
- Não preencher “Endereço do site” com IP **e** duplicar registros conflitantes na zona sem revisar o que já existe.
- Não commitar capturas de tela ou arquivos com chaves/senhas do Registro.br.

---

## Depois do DNS

1. Concluir HTTPS na VPS (`certbot --nginx -d sindesgv.com.br -d www.sindesgv.com.br`).
2. Testar:
   - `https://www.sindesgv.com.br/`
   - `https://sindesgv.com.br/` (idealmente redirecionar para `www` no nginx, se desejado — opcional, não incluído por padrão).
3. Seguir o health check em [deploy-hostinger.md](./deploy-hostinger.md).

---

## Placeholder do IP

Substitua em todos os registros:

```
SEU_IP_VPS
```

pelo IPv4 público informado pela Hostinger (hPanel → VPS → detalhes do servidor / IP).

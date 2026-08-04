# Motor de e-mail — Agent CrossDo

## 1. Repositório encontrado

### Portal CrossDo — referência

- Caminho local: `/root/workspace/portal-crossdo-app`
- Remote GitHub: `https://github.com/henriqueandrade142-cell/portal-crossdo-app.git`
- Branch atual: `main`
- Commit atual: `c7ff970`
- Documentação encontrada sobre e-mail:
  - `docs/legado/analise-crossdo-platform.md`
  - `app/src/core/motor_email.py`
  - `app/src/core/auth.py`
  - `app/src/api/routers/auth.py`
  - `app/src/config/settings.py`
  - `app/tests/core/test_motor_email.py`
  - `app/tests/core/test_enviar_cobranca_email.py`

### Agent CrossDo — novo portal

- Caminho local: `/root/workspace/agent-crossdo-app`
- Remote GitHub: `https://github.com/henriqueandrade142-cell/agent-crossdo-app.git`
- Branch atual: `main`
- Commit atual antes desta implementação: `fdfcfbb`
- Estado encontrado: frontend Vite/React estático, com login local em navegador e sem backend real de autenticação/e-mail.

## 2. Motor de e-mail existente no Portal CrossDo

- Arquivo principal: `app/src/core/motor_email.py`
- Função base: `enviar_email(destinatario, assunto, corpo_html, anexos=None)`
- Funções de template/fluxo:
  - `enviar_senha_primeiro_acesso`
  - `enviar_redefinicao_senha`
  - `enviar_acesso_contato_liberado`
  - `enviar_notificacao_novo_contato_pendente`
  - `enviar_conta_bloqueada`
  - `enviar_demonstrativo_cobranca`
- Provider usado no código atual: SMTP direto via `smtplib`
- Protocolo/porta: STARTTLS, porta `587`
- Autenticação: `server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)`
- Anexos: suportados via `MIMEApplication`, usado para PDF de demonstrativo.

Observação: a documentação do legado cita `BREVO_API_KEY`/Brevo, mas o código atual em `motor_email.py` usa SMTP corporativo Microsoft 365/Exchange. Portanto, para o Agent CrossDo, o padrão replicado foi SMTP, não Brevo.

## 3. Variáveis reais encontradas

Do arquivo `app/src/config/settings.py`:

```env
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=
SMTP_FROM_NAME=
PORTAL_URL=
CORS_ORIGINS=
BREVO_API_KEY=
```

Também existem variáveis gerais do backend:

```env
SECRET_KEY=
SESSION_EXPIRY_HOURS=
ENVIRONMENT=
LOG_LEVEL=
```

Para o Agent CrossDo, a adaptação necessária é:

```env
PORTAL_URL=https://agent.crossdo.app
CORS_ORIGINS=https://agent.crossdo.app
SMTP_FROM_NAME=Agent CrossDo
```

`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` e `SMTP_FROM_EMAIL` precisam vir do responsável pelas credenciais. Não foram inventados valores reais.

## 4. Fluxo de login e recuperação de senha encontrado

### Endpoint de login no Portal CrossDo

```text
POST /api/v1/auth/login
```

Arquivo:

```text
app/src/api/routers/auth.py
```

### Endpoint de solicitar recuperação

```text
POST /api/v1/auth/esqueci-senha
```

Arquivo:

```text
app/src/api/routers/auth.py
```

### Endpoint de redefinir senha

Não há endpoint separado de link tokenizado. O padrão encontrado é:

1. usuário informa e-mail;
2. backend procura usuário/contato ativo;
3. gera nova senha temporária;
4. envia e-mail primeiro;
5. só depois grava o hash novo no banco.

### Modelo/tabela de token

Não encontrado para recuperação de senha. Não há tabela de token específica documentada no padrão atual.

### Tempo de expiração do token

Não aplicável no padrão atual, porque o fluxo não usa token de reset.

### Como o link é montado

O link usa `settings.PORTAL_URL`.

Exemplos no Portal CrossDo:

```python
f"{url_portal.rstrip('/')}/docs/pop-uso-portal.html"
f"{url_portal.rstrip('/')}/portal"
```

Para o Agent CrossDo:

```text
https://agent.crossdo.app
```

### HTML ou texto puro

HTML. O motor usa `MIMEText(corpo_html, "html", "utf-8")`.

## 5. Implementação feita no novo portal

Criado backend mínimo em:

```text
backend/
```

Arquivos criados:

```text
backend/requirements.txt
backend/.env.example
backend/README.md
backend/src/agent_crossdo/__init__.py
backend/src/agent_crossdo/settings.py
backend/src/agent_crossdo/email_engine.py
backend/src/agent_crossdo/auth_flow.py
backend/src/agent_crossdo/api.py
backend/tests/test_email_engine.py
backend/tests/test_auth_flow.py
```

Frontend alterado:

```text
src/App.tsx
```

Alteração:

- incluído botão `Esqueci minha senha` na tela de login;
- botão chama `POST /api/v1/auth/esqueci-senha` usando `VITE_API_BASE_URL` quando configurado;
- se o backend ainda não estiver ativo, mostra erro claro sem inventar envio.

Segurança alterada:

```text
.gitignore
```

Adicionado bloqueio para `.env`, `.env.*`, `.venv` e `backend/.venv`, mantendo `.env.example` versionável.

## 6. O que precisa ser configurado na nova VPS

Arquivo real `.env` ou secrets da VPS, sem commitar:

```env
ENVIRONMENT=production
LOG_LEVEL=INFO
SECRET_KEY=<gerar valor forte>
SESSION_EXPIRY_HOURS=12
PORTAL_URL=https://agent.crossdo.app
CORS_ORIGINS=https://agent.crossdo.app
SMTP_HOST=<informar>
SMTP_PORT=587
SMTP_USER=<informar>
SMTP_PASSWORD=<secret>
SMTP_FROM_EMAIL=<informar>
SMTP_FROM_NAME=Agent CrossDo
```

Se o frontend chamar backend em outro subdomínio/porta, configurar também no build:

```env
VITE_API_BASE_URL=https://agent.crossdo.app
```

Ou, se backend ficar em `api.agent.crossdo.app`:

```env
VITE_API_BASE_URL=https://api.agent.crossdo.app
CORS_ORIGINS=https://agent.crossdo.app
```

## 7. Alterações ainda necessárias para produção

Como o `agent-crossdo-app` ainda era frontend-only/localStorage, esta etapa preparou o motor e os contratos, mas ainda falta conectar persistência real.

Necessário implementar:

- repositório PostgreSQL real para `AccountRepository`;
- tabela/migration de usuários;
- hashes de senha com bcrypt;
- endpoint real de login;
- endpoint de troca de senha;
- regra de bloqueio/tentativas se for manter o padrão do Portal CrossDo;
- deploy do backend FastAPI/uvicorn;
- reverse proxy/SSL para `agent.crossdo.app`;
- teste SMTP controlado com destinatário autorizado.

## 8. Riscos encontrados

1. O portal novo estava com login local no navegador e armazenamento em `localStorage`; isso não serve para produção.
2. O padrão atual do Portal CrossDo recupera senha enviando uma senha temporária, não um link tokenizado. Funciona e está documentado, mas link tokenizado seria evolução futura.
3. A documentação legada menciona Brevo, mas o código atual usa SMTP. Usar a documentação antiga sem ler o código causaria configuração errada.
4. Não foram encontradas credenciais reais nesta implementação. Se alguém encontrar credenciais no repositório, deve rotacionar e não replicar.

## 9. Plano seguro de implementação

### Fase 1 — Diagnóstico sem alteração

Concluída nesta análise:

- localizar repositórios;
- identificar motor atual;
- identificar variáveis reais;
- identificar fluxo de recuperação;
- identificar ausência de backend real no Agent CrossDo.

### Fase 2 — Preparação da nova VPS

- criar `.env` real fora do Git;
- configurar `PORTAL_URL=https://agent.crossdo.app`;
- configurar `CORS_ORIGINS=https://agent.crossdo.app`;
- validar conexão SMTP sem imprimir senha;
- preparar reverse proxy/SSL.

### Fase 3 — Implementação no novo portal

- manter `backend/src/agent_crossdo/email_engine.py` como motor;
- implementar `AccountRepository` com PostgreSQL;
- criar migrations de usuários/sessões;
- substituir login local do frontend por login real;
- manter botão `Esqueci minha senha` apontando para `/api/v1/auth/esqueci-senha`.

### Fase 4 — Testes

- teste unitário do motor de e-mail;
- teste de solicitação de recuperação sem e-mail cadastrado;
- teste de recuperação com conta ativa;
- teste de falha SMTP sem alterar senha;
- teste de login com senha temporária;
- teste de troca de senha;
- teste real controlado para um e-mail autorizado.

### Fase 5 — Validação final

- validar HTTPS;
- validar CORS;
- validar que `.env` não entrou no Git;
- validar logs sem senha/token;
- validar e-mail recebido apontando para `https://agent.crossdo.app`;
- validar que não houve disparo em massa.

## 10. Mensagem pronta para pedir credenciais

```text
Preciso configurar o envio de e-mails automáticos do novo portal CrossDo em https://agent.crossdo.app.

Favor informar/criar as credenciais SMTP ou provedor transacional usadas pelo Portal CrossDo atual:

- Host SMTP:
- Porta:
- Usuário:
- Senha/app password:
- E-mail remetente:
- Nome remetente:
- Regras de SPF/DKIM/DMARC, se houver:

O motor atual do Portal CrossDo usa SMTP com STARTTLS na porta 587. Não preciso da senha pelo chat se preferirem cadastrar direto no arquivo de ambiente/secret da VPS.

Se houver DNS relacionado a e-mail, favor confirmar SPF, DKIM e DMARC do domínio remetente que será usado no Agent CrossDo.
```

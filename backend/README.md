# Motor de e-mail — Agent CrossDo

Este backend prepara o motor de envio de e-mails automáticos do Agent CrossDo reaproveitando o padrão encontrado no Portal CrossDo atual.

## Referência usada

Repositório de referência:

```text
/root/workspace/portal-crossdo-app
https://github.com/henriqueandrade142-cell/portal-crossdo-app.git
```

Arquivos principais no portal atual:

```text
app/src/core/motor_email.py
app/src/core/auth.py
app/src/api/routers/auth.py
app/src/config/settings.py
app/tests/core/test_motor_email.py
app/tests/core/test_enviar_cobranca_email.py
```

## Decisão técnica

O Portal CrossDo documentava historicamente `BREVO_API_KEY`, mas o motor atual encontrado usa **SMTP direto via `smtplib`**.

Padrão encontrado:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM_EMAIL`
- `SMTP_FROM_NAME`
- `PORTAL_URL`
- `CORS_ORIGINS`

O padrão foi adaptado para:

```text
PORTAL_URL=https://agent.crossdo.app
SMTP_FROM_NAME=Agent CrossDo
```

## O que está implementado aqui

```text
backend/src/agent_crossdo/settings.py
backend/src/agent_crossdo/email_engine.py
backend/src/agent_crossdo/auth_flow.py
backend/src/agent_crossdo/api.py
backend/.env.example
backend/tests/
```

## Rotas preparadas

```text
GET  /health
POST /api/v1/auth/esqueci-senha
```

A rota de `esqueci-senha` está segura para desenvolvimento: enquanto não houver repositório PostgreSQL real, ela não inventa usuário e sempre retorna mensagem genérica.

## Regra de segurança herdada

No fluxo de recuperação, o e-mail é enviado **antes** de atualizar a senha no banco. Se o SMTP falhar, a senha antiga continua válida.

## O que falta para produção

- Implementar `AccountRepository` real com PostgreSQL.
- Ligar login real do frontend ao backend.
- Definir migrations/tabelas de usuários/sessões conforme modelo final do Agent CrossDo.
- Configurar `.env` real na VPS sem commitar.
- Testar SMTP com destinatário autorizado.

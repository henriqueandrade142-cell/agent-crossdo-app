from types import SimpleNamespace

from agent_crossdo import email_engine


def test_enviar_email_com_multiplos_destinatarios_e_anexo(monkeypatch):
    enviado = {}

    class FakeSMTP:
        def __init__(self, *args, **kwargs):
            enviado["init"] = args

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def starttls(self):
            enviado["starttls"] = True

        def login(self, user, password):
            enviado["login"] = (user, password)

        def sendmail(self, remetente, destinatarios, corpo):
            enviado.update(remetente=remetente, destinatarios=destinatarios, corpo=corpo)

    monkeypatch.setattr(
        email_engine,
        "settings",
        SimpleNamespace(
            smtp_host="smtp.office365.com",
            smtp_port=587,
            smtp_from_email="no-reply@crossdo.app",
            smtp_from_name="Agent CrossDo",
            smtp_user="smtp-user",
            smtp_password="smtp-secret",
            brevo_api_key="",
            brevo_api_url="https://api.brevo.com/v3/smtp/email",
        ),
    )
    monkeypatch.setattr(email_engine.smtplib, "SMTP", FakeSMTP)

    email_engine.enviar_email(
        "a@cliente.com; b@cliente.com",
        "Assunto",
        "<p>corpo</p>",
        anexos=[("demonstrativo.pdf", b"%PDF fake")],
    )

    assert enviado["starttls"] is True
    assert enviado["destinatarios"] == ["a@cliente.com", "b@cliente.com"]
    assert enviado["remetente"] == "no-reply@crossdo.app"
    assert "demonstrativo.pdf" in enviado["corpo"]
    assert "application/pdf" in enviado["corpo"]


def test_enviar_email_usa_brevo_sem_anexo(monkeypatch):
    chamadas = []

    class FakeResponse:
        status = 201
        def __enter__(self): return self
        def __exit__(self, *args): return False

    def fake_urlopen(req, timeout):
        chamadas.append((req, timeout))
        return FakeResponse()

    monkeypatch.setattr(
        email_engine,
        "settings",
        SimpleNamespace(
            smtp_host="smtp.office365.com",
            smtp_port=587,
            smtp_from_email="no-reply@crossdo.app",
            smtp_from_name="Agent CrossDo",
            smtp_user="",
            smtp_password="",
            brevo_api_key="brevo-secret",
            brevo_api_url="https://api.brevo.com/v3/smtp/email",
        ),
    )
    monkeypatch.setattr(email_engine.urllib.request, "urlopen", fake_urlopen)

    email_engine.enviar_email("a@cliente.com", "Assunto", "<p>corpo</p>")

    assert chamadas
    req, timeout = chamadas[0]
    assert timeout == 30
    assert req.headers["Api-key"] == "brevo-secret"


def test_templates_usam_agent_crossdo_e_url_nova(monkeypatch):
    enviados = []
    monkeypatch.setattr(email_engine, "enviar_email", lambda *args, **kwargs: enviados.append((args, kwargs)))

    email_engine.enviar_redefinicao_senha(
        "usuario@crossdo.app",
        "Usuário",
        "senha-temp",
        "https://agent.crossdo.app",
    )

    assert enviados
    args, _kwargs = enviados[0]
    assert args[0] == "usuario@crossdo.app"
    assert args[1] == "Redefinição de senha — Agent CrossDo"
    assert "Agent CrossDo" in args[2]
    assert "https://agent.crossdo.app" in args[2]


def test_template_primeiro_acesso_tem_link_e_instrucao(monkeypatch):
    enviados = []
    monkeypatch.setattr(email_engine, "enviar_email", lambda *args, **kwargs: enviados.append((args, kwargs)))

    email_engine.enviar_senha_primeiro_acesso("novo@crossdo.app", "Novo", "senha-temp", "https://agent.crossdo.app")

    args, _kwargs = enviados[0]
    assert args[1] == "Seu acesso ao Agent CrossDo"
    assert "senha-temp" in args[2]
    assert "alter" in args[2].lower()
    assert "https://agent.crossdo.app" in args[2]

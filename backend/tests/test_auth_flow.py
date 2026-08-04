from agent_crossdo import auth_flow
from agent_crossdo.auth_flow import Account


class FakeRepo:
    def __init__(self, account=None):
        self.account = account
        self.updated = []

    def find_active_by_email(self, email):
        self.lookup = email
        return self.account

    def update_password_hash(self, account_id, password_hash):
        self.updated.append((account_id, password_hash))


def test_esqueci_senha_resposta_generica_quando_email_nao_existe():
    repo = FakeRepo(None)

    result = auth_flow.solicitar_redefinicao_senha("naoexiste@crossdo.app", repo, "https://agent.crossdo.app")

    assert result["ok"] is True
    assert "Se esse e-mail estiver cadastrado" in result["mensagem"]
    assert result["email_sent"] is False
    assert repo.updated == []


def test_esqueci_senha_envia_email_antes_de_salvar_hash(monkeypatch):
    ordem = []
    repo = FakeRepo(Account(id="USR-1", nome="Henrique", email="henrique@crossdo.app"))

    def fake_email(destinatario, nome, senha, url):
        ordem.append("email")
        assert destinatario == "henrique@crossdo.app"
        assert nome == "Henrique"
        assert url == "https://agent.crossdo.app"
        assert senha

    def fake_hash(senha):
        ordem.append("hash")
        return "hash-gerado"

    monkeypatch.setattr(auth_flow.email_engine, "enviar_redefinicao_senha", fake_email)
    monkeypatch.setattr(auth_flow, "hash_senha", fake_hash)

    result = auth_flow.solicitar_redefinicao_senha("HENRIQUE@CROSSDO.APP ", repo, "https://agent.crossdo.app")

    assert result["email_sent"] is True
    assert ordem == ["email", "hash"]
    assert repo.lookup == "henrique@crossdo.app"
    assert repo.updated == [("USR-1", "hash-gerado")]


def test_esqueci_senha_nao_salva_hash_se_smtp_falhar(monkeypatch):
    repo = FakeRepo(Account(id="USR-1", nome="Henrique", email="henrique@crossdo.app"))

    def fail_email(*args, **kwargs):
        raise RuntimeError("SMTP indisponível")

    monkeypatch.setattr(auth_flow.email_engine, "enviar_redefinicao_senha", fail_email)

    try:
        auth_flow.solicitar_redefinicao_senha("henrique@crossdo.app", repo, "https://agent.crossdo.app")
    except RuntimeError:
        pass

    assert repo.updated == []


def test_criar_usuario_envia_primeiro_acesso_antes_de_salvar(monkeypatch):
    ordem = []
    account = Account(id="USR-2", nome="Novo Usuário", email="novo@crossdo.app")

    def fake_email(destinatario, nome, senha, url):
        ordem.append("email")
        assert destinatario == "novo@crossdo.app"
        assert nome == "Novo Usuário"
        assert senha
        assert url == "https://agent.crossdo.app"

    def fake_hash(senha):
        ordem.append("hash")
        return "hash-novo"

    def fake_save(acc, password_hash):
        ordem.append("save")
        assert acc == account
        assert password_hash == "hash-novo"

    monkeypatch.setattr(auth_flow.email_engine, "enviar_senha_primeiro_acesso", fake_email)
    monkeypatch.setattr(auth_flow, "hash_senha", fake_hash)

    result = auth_flow.criar_usuario_com_senha_temporaria(account, FakeRepo(), "https://agent.crossdo.app", fake_save)

    assert result["email_sent"] is True
    assert ordem == ["email", "hash", "save"]

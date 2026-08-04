"""Fluxos de autenticação que disparam e-mail."""
from __future__ import annotations

import secrets
import string
from dataclasses import dataclass
from typing import Protocol

import bcrypt

from . import email_engine


@dataclass
class Account:
    id: str
    nome: str
    email: str
    ativo: bool = True


class AccountRepository(Protocol):
    def find_active_by_email(self, email: str) -> Account | None: ...
    def update_password_hash(self, account_id: str, password_hash: str) -> None: ...


def gerar_senha_temporaria(tamanho: int = 12) -> str:
    alfabeto = string.ascii_letters + string.digits + "!@#$%"
    return "".join(secrets.choice(alfabeto) for _ in range(tamanho))


def hash_senha(senha_plana: str) -> str:
    return bcrypt.hashpw(senha_plana.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def solicitar_redefinicao_senha(email: str, repo: AccountRepository, url_portal: str) -> dict[str, object]:
    mensagem = "Se esse e-mail estiver cadastrado e ativo, enviamos uma nova senha para ele."
    normalized = email.strip().lower()
    account = repo.find_active_by_email(normalized)
    if not account:
        return {"ok": True, "mensagem": mensagem, "email_sent": False}

    senha = gerar_senha_temporaria()
    email_engine.enviar_redefinicao_senha(account.email, account.nome or account.email, senha, url_portal)
    repo.update_password_hash(account.id, hash_senha(senha))
    return {"ok": True, "mensagem": mensagem, "email_sent": True}


def criar_usuario_com_senha_temporaria(account: Account, repo: AccountRepository, url_portal: str, save_func) -> dict[str, object]:
    senha = gerar_senha_temporaria()
    email_engine.enviar_senha_primeiro_acesso(account.email, account.nome or account.email, senha, url_portal)
    password_hash = hash_senha(senha)
    save_func(account, password_hash)
    return {"ok": True, "mensagem": "Usuário criado e senha temporária enviada por e-mail.", "email_sent": True}

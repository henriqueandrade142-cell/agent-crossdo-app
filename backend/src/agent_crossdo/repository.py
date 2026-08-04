"""Repositório simples de contas em JSON para a fase inicial do Agent CrossDo.

Não substitui o PostgreSQL final, mas permite envio real de primeiro acesso e
reset de senha sem guardar segredos no frontend.
"""
from __future__ import annotations

import json
from pathlib import Path
from threading import Lock
from uuid import uuid4

from .auth_flow import Account
from .settings import settings

MASTER_EMAIL = "henrique.andrade142@gmail.com"
MASTER_WHATSAPP = "(31) 98502-4841"
MASTER_SETOR = "TI"


class JsonAccountRepository:
    def __init__(self, path: str | None = None) -> None:
        self.path = Path(path or settings.data_dir) / "accounts.json"
        self._lock = Lock()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if not self.path.exists():
            self._write({"accounts": []})
        self.ensure_master()

    def _read(self) -> dict:
        return json.loads(self.path.read_text(encoding="utf-8"))

    def _write(self, data: dict) -> None:
        tmp = self.path.with_suffix(".tmp")
        tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp.replace(self.path)
        self.path.chmod(0o600)

    def ensure_master(self) -> None:
        with self._lock:
            data = self._read()
            accounts = data.setdefault("accounts", [])
            existing = next((item for item in accounts if item.get("email") == MASTER_EMAIL), None)
            master_data = {
                "id": "USR-0001",
                "nome": "Henrique Andrade",
                "email": MASTER_EMAIL,
                "whatsapp": MASTER_WHATSAPP,
                "setor": MASTER_SETOR,
                "perfil": "Master",
                "status": "Ativo",
                "protegido": True,
            }
            if existing:
                existing.update(master_data)
            else:
                accounts.append({**master_data, "password_hash": ""})
            self._write(data)

    def find_active_by_email(self, email: str) -> Account | None:
        data = self._read()
        normalized = email.strip().lower()
        for item in data.get("accounts", []):
            if item.get("email", "").lower() == normalized and item.get("status") == "Ativo":
                return Account(id=item["id"], nome=item.get("nome", ""), email=item["email"], ativo=True)
        return None

    def update_password_hash(self, account_id: str, password_hash: str) -> None:
        with self._lock:
            data = self._read()
            for item in data.get("accounts", []):
                if item.get("id") == account_id:
                    item["password_hash"] = password_hash
                    self._write(data)
                    return
            raise KeyError("Conta não encontrada")

    def email_exists(self, email: str) -> bool:
        normalized = email.strip().lower()
        return any(item.get("email", "").lower() == normalized for item in self._read().get("accounts", []))

    def create_account(self, payload: dict, password_hash: str) -> Account:
        with self._lock:
            data = self._read()
            accounts = data.setdefault("accounts", [])
            email = payload["email"].strip().lower()
            if any(item.get("email", "").lower() == email for item in accounts):
                raise ValueError("Já existe usuário com este e-mail")
            account = {
                "id": payload.get("id") or f"USR-{uuid4().hex[:10].upper()}",
                "nome": payload["nome"].strip(),
                "email": email,
                "whatsapp": payload.get("whatsapp", ""),
                "setor": payload.get("setor", ""),
                "perfil": payload.get("perfil", "Atendimento"),
                "status": payload.get("status", "Ativo"),
                "protegido": False,
                "password_hash": password_hash,
            }
            accounts.append(account)
            self._write(data)
            return Account(id=account["id"], nome=account["nome"], email=account["email"], ativo=account["status"] == "Ativo")

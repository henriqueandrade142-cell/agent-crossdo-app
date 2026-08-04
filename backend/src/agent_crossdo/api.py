"""API do Agent CrossDo para autenticação/e-mail."""
from __future__ import annotations

import re

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

from .auth_flow import Account, criar_usuario_com_senha_temporaria, solicitar_redefinicao_senha
from .repository import JsonAccountRepository
from .settings import settings

app = FastAPI(title="Agent CrossDo API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

repo = JsonAccountRepository()


def _valid_whatsapp(value: str) -> bool:
    if not value:
        return True
    digits = re.sub(r"\D", "", value)
    return len(digits) in (10, 11)


class EsqueciSenhaRequest(BaseModel):
    email: EmailStr


class UsuarioCreateRequest(BaseModel):
    id: str | None = None
    nome: str = Field(min_length=2)
    email: EmailStr
    whatsapp: str = ""
    setor: str = Field(min_length=2)
    perfil: str = "Atendimento"
    status: str = "Ativo"


@app.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@app.post("/api/v1/auth/esqueci-senha")
def esqueci_senha(payload: EsqueciSenhaRequest) -> dict[str, object]:
    try:
        result = solicitar_redefinicao_senha(payload.email, repo, settings.portal_url)
    except Exception as exc:  # sem segredo no detalhe
        raise HTTPException(status_code=503, detail="Não foi possível enviar o e-mail agora.") from exc
    result.pop("email_sent", None)
    return result


@app.post("/api/v1/usuarios")
def criar_usuario(payload: UsuarioCreateRequest) -> dict[str, object]:
    if not _valid_whatsapp(payload.whatsapp):
        raise HTTPException(status_code=422, detail="WhatsApp inválido. Informe DDD e número.")
    if repo.email_exists(str(payload.email)):
        raise HTTPException(status_code=409, detail="Já existe usuário com este e-mail.")

    account = Account(id=payload.id or "", nome=payload.nome, email=str(payload.email), ativo=payload.status == "Ativo")

    def save_func(acc: Account, password_hash: str) -> None:
        repo.create_account({**payload.model_dump(), "id": acc.id}, password_hash)

    try:
        return criar_usuario_com_senha_temporaria(account, repo, settings.portal_url, save_func)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Não foi possível enviar a senha por e-mail.") from exc


@app.post("/api/v1/usuarios/resetar-senha")
def resetar_senha(payload: EsqueciSenhaRequest) -> dict[str, object]:
    try:
        result = solicitar_redefinicao_senha(payload.email, repo, settings.portal_url)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Não foi possível enviar a nova senha por e-mail.") from exc
    result.pop("email_sent", None)
    return result

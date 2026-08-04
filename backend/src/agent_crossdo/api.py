"""API do Agent CrossDo para autenticação/e-mail e cadastro Grupo/Cliente."""
from __future__ import annotations

import re

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

from .auth_flow import Account, criar_usuario_com_senha_temporaria, solicitar_redefinicao_senha
from .group_repository import JsonGroupRepository
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
group_repo = JsonGroupRepository()


def _valid_whatsapp(value: str) -> bool:
    if not value:
        return True
    digits = re.sub(r"\D", "", value)
    return len(digits) in (10, 11)


def _check_n8n_token(token: str | None) -> None:
    expected = getattr(settings, "n8n_ingest_token", "")
    if expected and token != expected:
        raise HTTPException(status_code=401, detail="Token inválido")


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


class GrupoN8nRequest(BaseModel):
    idGrupo: str | None = None
    groupId: str | None = None
    remoteJid: str | None = None
    nomeGrupo: str | None = None
    groupName: str | None = None
    subject: str | None = None
    crossAgentAdicionado: bool | None = None
    crossAgentInGroup: bool | None = None
    contatos: list[dict] = []
    participants: list[dict] = []


class GrupoRemovedRequest(BaseModel):
    idGrupo: str | None = None
    groupId: str | None = None
    remoteJid: str | None = None


class GrupoUpdateRequest(BaseModel):
    nomeCliente: str = ""
    documento: str = ""
    responsavelCliente: str = ""
    emailResponsavel: str = ""
    telefoneResponsavel: str = ""
    unidade: str = "Nova Lima/MG"
    demandaMonitorada: bool = False
    agentAtivo: bool = False
    funcionalidades: list[str] = []
    wmsApiKeyUsuario: str = ""
    wmsApiKey: str = ""
    observacoes: str = ""
    statusGrupo: str = "Ativo"
    contatos: list[dict] = []


@app.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@app.post("/api/v1/auth/esqueci-senha")
def esqueci_senha(payload: EsqueciSenhaRequest) -> dict[str, object]:
    try:
        result = solicitar_redefinicao_senha(payload.email, repo, settings.portal_url)
    except Exception as exc:
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


@app.get("/api/v1/grupos-clientes")
def listar_grupos_clientes() -> dict[str, object]:
    return {"items": group_repo.list_groups()}


@app.put("/api/v1/grupos-clientes/{record_id}")
def atualizar_grupo_cliente(record_id: str, payload: GrupoUpdateRequest) -> dict[str, object]:
    try:
        return group_repo.update_business_fields(record_id, payload.model_dump())
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Cadastro não encontrado") from exc


@app.post("/api/v1/n8n/grupos/upsert")
def n8n_upsert_grupo(payload: GrupoN8nRequest, x_agent_token: str | None = Header(default=None)) -> dict[str, object]:
    _check_n8n_token(x_agent_token)
    try:
        return group_repo.upsert_from_n8n(payload.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/api/v1/n8n/grupos/removido")
def n8n_grupo_removido(payload: GrupoRemovedRequest, x_agent_token: str | None = Header(default=None)) -> dict[str, object]:
    _check_n8n_token(x_agent_token)
    id_grupo = payload.idGrupo or payload.groupId or payload.remoteJid
    if not id_grupo:
        raise HTTPException(status_code=422, detail="idGrupo é obrigatório")
    return group_repo.mark_removed(id_grupo)

"""Persistência JSON inicial para Grupo/Cliente e contatos capturados do WhatsApp/n8n."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from uuid import uuid4

from .settings import settings


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _digits(value: str) -> str:
    return ''.join(ch for ch in (value or '') if ch.isdigit())


class JsonGroupRepository:
    def __init__(self, path: str | None = None) -> None:
        self.path = Path(path or settings.data_dir) / "client_groups.json"
        self._lock = Lock()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if not self.path.exists():
            self._write({"groups": []})

    def _read(self) -> dict:
        return json.loads(self.path.read_text(encoding="utf-8"))

    def _write(self, data: dict) -> None:
        tmp = self.path.with_suffix(".tmp")
        tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp.replace(self.path)
        self.path.chmod(0o600)

    def list_groups(self) -> list[dict]:
        data = self._read()
        groups = [self._normalize_group(group) for group in data.get("groups", [])]
        if groups != data.get("groups", []):
            data["groups"] = groups
            self._write(data)
        return [self._public_group(group) for group in groups]

    def get_by_id(self, record_id: str) -> dict | None:
        return next((g for g in self.list_groups() if g.get("id") == record_id), None)

    def upsert_from_n8n(self, payload: dict) -> dict:
        id_grupo = str(payload.get("idGrupo") or payload.get("groupId") or payload.get("remoteJid") or "").strip()
        nome_grupo = str(payload.get("nomeGrupo") or payload.get("groupName") or payload.get("subject") or "").strip()
        if not id_grupo:
            raise ValueError("idGrupo é obrigatório")
        if not nome_grupo:
            nome_grupo = id_grupo

        incoming_contacts = [self._normalize_contact(c) for c in payload.get("contatos") or payload.get("participants") or []]
        detected_cross_agent = self._detect_cross_agent(payload, incoming_contacts)
        with self._lock:
            data = self._read()
            groups = data.setdefault("groups", [])
            existing = next((g for g in groups if g.get("idGrupo") == id_grupo), None)
            if existing:
                existing["nomeGrupo"] = nome_grupo
                existing["statusGrupo"] = "Ativo"
                existing["origemCadastro"] = "n8n"
                if detected_cross_agent is not None:
                    existing["crossAgentAdicionado"] = detected_cross_agent
                    if not detected_cross_agent:
                        existing["agentAtivo"] = False
                existing["contatos"] = self._merge_contacts(existing.get("contatos", []), incoming_contacts)
                existing["updatedAt"] = _now()
                record = existing
            else:
                record = self._blank_record(nome_grupo, id_grupo)
                if detected_cross_agent is not None:
                    record["crossAgentAdicionado"] = detected_cross_agent
                record["contatos"] = incoming_contacts
                groups.insert(0, record)
            self._write(data)
            return record

    def mark_removed(self, id_grupo: str) -> dict:
        with self._lock:
            data = self._read()
            for group in data.get("groups", []):
                if group.get("idGrupo") == id_grupo:
                    group["statusGrupo"] = "Inativo"
                    group["updatedAt"] = _now()
                    self._write(data)
                    return group
            record = self._blank_record(id_grupo, id_grupo)
            record["statusGrupo"] = "Inativo"
            data.setdefault("groups", []).insert(0, record)
            self._write(data)
            return record

    def update_business_fields(self, record_id: str, payload: dict) -> dict:
        allowed = {
            "nomeCliente", "documento", "responsavelCliente", "emailResponsavel",
            "telefoneResponsavel", "unidade", "demandaMonitorada",
            "agentAtivo", "funcionalidades",
            "wmsApiKeyUsuario", "observacoes", "contatos", "statusGrupo",
        }
        with self._lock:
            data = self._read()
            for group in data.get("groups", []):
                if group.get("id") == record_id:
                    incoming = dict(payload)
                    if not group.get("crossAgentAdicionado"):
                        incoming["agentAtivo"] = False
                        incoming["funcionalidades"] = []
                    for key in allowed:
                        if key in incoming:
                            group[key] = incoming[key]
                    if payload.get("wmsApiKey"):
                        group["wmsApiKey"] = str(payload["wmsApiKey"]).strip()
                    group["updatedAt"] = _now()
                    self._write(data)
                    return self._public_group(group)
        raise KeyError("Cadastro não encontrado")

    def _blank_record(self, nome_grupo: str, id_grupo: str) -> dict:
        return {
            "id": f"CG-{uuid4().hex[:10].upper()}",
            "nomeGrupo": nome_grupo,
            "idGrupo": id_grupo,
            "statusGrupo": "Ativo",
            "nomeCliente": "",
            "documento": "",
            "responsavelCliente": "",
            "emailResponsavel": "",
            "telefoneResponsavel": "",
            "unidade": "Nova Lima/MG",
            "demandaMonitorada": False,
            "crossAgentAdicionado": False,
            "agentAtivo": False,
            "funcionalidades": [],
            "wmsApiKeyUsuario": "",
            "wmsApiKey": "",
            "observacoes": "",
            "origemCadastro": "n8n",
            "contatos": [],
            "createdAt": _now(),
            "updatedAt": _now(),
        }

    def _detect_cross_agent(self, payload: dict, contacts: list[dict]) -> bool | None:
        explicit = payload.get("crossAgentAdicionado")
        if explicit is None:
            explicit = payload.get("crossAgentInGroup")
        if explicit is not None:
            return bool(explicit)
        expected_numbers = {_digits(number) for number in settings.cross_agent_whatsapp_numbers if _digits(number)}
        if not expected_numbers:
            return None
        contact_numbers = {_digits(contact.get("whatsapp", "")) for contact in contacts if _digits(contact.get("whatsapp", ""))}
        return bool(expected_numbers & contact_numbers)

    def _normalize_group(self, group: dict) -> dict:
        base = self._blank_record(str(group.get("nomeGrupo") or group.get("idGrupo") or ""), str(group.get("idGrupo") or ""))
        base.update(group)
        if isinstance(base.get("demandaMonitorada"), str):
            base["demandaMonitorada"] = bool(base["demandaMonitorada"].strip())
        base.setdefault("crossAgentAdicionado", False)
        base.setdefault("agentAtivo", False)
        base.setdefault("funcionalidades", [])
        base.setdefault("wmsApiKeyUsuario", "")
        base.setdefault("wmsApiKey", "")
        base.pop("sla", None)
        base.pop("regraAtendimento", None)
        base["contatos"] = [self._normalize_contact(c) for c in base.get("contatos", [])]
        return base

    def _public_group(self, group: dict) -> dict:
        public = dict(group)
        api_key = str(public.pop("wmsApiKey", "") or "")
        public["wmsApiKey"] = ""
        public["wmsApiKeySet"] = bool(api_key)
        return public

    def _normalize_contact(self, contact: dict) -> dict:
        whatsapp = str(contact.get("whatsapp") or contact.get("numero") or contact.get("phone") or contact.get("id") or "")
        return {
            "id": contact.get("id") or f"CTT-{uuid4().hex[:10].upper()}",
            "nome": str(contact.get("nome") or contact.get("name") or ""),
            "funcao": str(contact.get("funcao") or contact.get("role") or ""),
            "whatsapp": whatsapp,
            "email": str(contact.get("email") or "").strip().lower(),
            "tipo": contact.get("tipo") or "Não definido",
        }

    def _merge_contacts(self, current: list[dict], incoming: list[dict]) -> list[dict]:
        by_phone = {_digits(c.get("whatsapp", "")): dict(c) for c in current if _digits(c.get("whatsapp", ""))}
        without_phone = [dict(c) for c in current if not _digits(c.get("whatsapp", ""))]
        for contact in incoming:
            phone = _digits(contact.get("whatsapp", ""))
            if not phone:
                without_phone.append(contact)
                continue
            previous = by_phone.get(phone, {})
            by_phone[phone] = {**previous, **{k: v for k, v in contact.items() if v not in (None, "")}, "id": previous.get("id") or contact.get("id")}
        return list(by_phone.values()) + without_phone

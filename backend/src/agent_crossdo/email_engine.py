"""Motor de e-mail transacional do Agent CrossDo.

Usa Brevo API quando `BREVO_API_KEY` existir e SMTP como fallback. Segredos
ficam apenas em variáveis de ambiente da VPS.
"""
from __future__ import annotations

import json
import re
import smtplib
import urllib.request
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from .settings import settings

_AZUL = "#072d51"
_LARANJA = "#fd5c12"
_AZUL_CLARO = "#e7edf5"


def _split_destinatarios(destinatario: str) -> list[str]:
    return [email.strip() for email in re.split(r"[,;]", destinatario) if email.strip()]


def _from_email() -> str:
    remetente = settings.smtp_from_email or settings.smtp_user
    if not remetente:
        raise RuntimeError("SMTP_FROM_EMAIL ou SMTP_USER não configurado")
    return remetente


def _enviar_brevo(destinatarios: list[str], assunto: str, corpo_html: str) -> None:
    payload = {
        "sender": {"name": settings.smtp_from_name, "email": _from_email()},
        "to": [{"email": email} for email in destinatarios],
        "subject": assunto,
        "htmlContent": corpo_html,
    }
    req = urllib.request.Request(
        settings.brevo_api_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "accept": "application/json",
            "api-key": settings.brevo_api_key,
            "content-type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        if response.status >= 300:
            raise RuntimeError(f"Brevo retornou HTTP {response.status}")


def _enviar_smtp(destinatarios: list[str], assunto: str, corpo_html: str, anexos: list[tuple[str, bytes]] | None = None) -> None:
    if not settings.smtp_user or not settings.smtp_password:
        raise RuntimeError("SMTP_USER/SMTP_PASSWORD não configurados")

    msg = MIMEMultipart("mixed") if anexos else MIMEMultipart("alternative")
    msg["Subject"] = assunto
    msg["From"] = f"{settings.smtp_from_name} <{_from_email()}>"
    msg["To"] = ", ".join(destinatarios)
    msg.attach(MIMEText(corpo_html, "html", "utf-8"))

    for nome_arquivo, conteudo in anexos or []:
        parte = MIMEApplication(conteudo, _subtype="pdf")
        parte.add_header("Content-Disposition", "attachment", filename=nome_arquivo)
        msg.attach(parte)

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30) as server:
        server.starttls()
        server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(_from_email(), destinatarios, msg.as_string())


def enviar_email(destinatario: str, assunto: str, corpo_html: str, anexos: list[tuple[str, bytes]] | None = None) -> None:
    destinatarios = _split_destinatarios(destinatario)
    if not destinatarios:
        raise ValueError("Nenhum destinatário válido informado")
    if settings.brevo_api_key and not anexos:
        _enviar_brevo(destinatarios, assunto, corpo_html)
        return
    _enviar_smtp(destinatarios, assunto, corpo_html, anexos)


def _container_email(titulo: str, conteudo_html: str) -> str:
    return f"""
    <div style="max-width:640px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#333;font-size:14px;line-height:1.55;">
      <div style="background:{_AZUL_CLARO};border-radius:8px 8px 0 0;padding:16px;text-align:center;">
        <span style="font-size:20px;font-weight:bold;color:{_AZUL};">Agent </span>
        <span style="font-size:20px;font-weight:bold;color:{_LARANJA};">CrossDo</span>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:24px;">
        <h2 style="color:{_LARANJA};font-size:18px;margin:0 0 16px;">{titulo}</h2>
        {conteudo_html}
        <p style="margin:18px 0 0;font-size:12px;color:#888;">Se você não solicitou este acesso, avise o responsável pelo portal.</p>
      </div>
    </div>
    """


def enviar_senha_primeiro_acesso(destinatario: str, nome: str, senha_temporaria: str, url_portal: str) -> None:
    corpo = _container_email(
        "Seu acesso ao Agent CrossDo",
        f"""
        <p>Olá, {nome}.</p>
        <p>Seu cadastro no Agent CrossDo foi criado.</p>
        <p><b>E-mail:</b> {destinatario}<br><b>Senha temporária:</b> {senha_temporaria}</p>
        <p>Acesse o portal pelo link abaixo e altere a senha no primeiro acesso.</p>
        <p><a href="{url_portal}" style="color:{_LARANJA};font-weight:bold;">Acessar o Agent CrossDo</a></p>
        """,
    )
    enviar_email(destinatario, "Seu acesso ao Agent CrossDo", corpo)


def enviar_redefinicao_senha(destinatario: str, nome: str, senha_temporaria: str, url_portal: str) -> None:
    corpo = _container_email(
        "Redefinição de senha",
        f"""
        <p>Olá, {nome}.</p>
        <p>Sua senha do Agent CrossDo foi redefinida. Nova senha temporária:</p>
        <p style="font-size:18px;"><b>{senha_temporaria}</b></p>
        <p>Acesse o portal pelo link abaixo e altere a senha assim que entrar.</p>
        <p><a href="{url_portal}" style="color:{_LARANJA};font-weight:bold;">Acessar o Agent CrossDo</a></p>
        """,
    )
    enviar_email(destinatario, "Redefinição de senha — Agent CrossDo", corpo)

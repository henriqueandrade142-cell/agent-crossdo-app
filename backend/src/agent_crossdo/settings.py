"""Configuração do Agent CrossDo via variáveis de ambiente.

Valores reais devem ficar em .env/secrets da VPS, nunca no Git.
"""
from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


def _csv_env(name: str, default: str) -> list[str]:
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    environment: str = os.getenv("ENVIRONMENT", "development")
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    secret_key: str = os.getenv("SECRET_KEY", "")
    session_expiry_hours: int = int(os.getenv("SESSION_EXPIRY_HOURS", "12"))

    portal_url: str = os.getenv("PORTAL_URL", "https://agent.crossdo.app")
    cors_origins: tuple[str, ...] = tuple(_csv_env("CORS_ORIGINS", "https://agent.crossdo.app,http://localhost:5173"))
    data_dir: str = os.getenv("AGENT_CROSSDO_DATA_DIR", "/var/lib/agent-crossdo")

    smtp_host: str = os.getenv("SMTP_HOST", "smtp.office365.com")
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_user: str = os.getenv("SMTP_USER", "")
    smtp_password: str = os.getenv("SMTP_PASSWORD", "")
    smtp_from_email: str = os.getenv("SMTP_FROM_EMAIL", os.getenv("MAIL_FROM_EMAIL", ""))
    smtp_from_name: str = os.getenv("SMTP_FROM_NAME", os.getenv("MAIL_FROM_NAME", "Agent CrossDo"))

    brevo_api_key: str = os.getenv("BREVO_API_KEY", "")
    brevo_api_url: str = os.getenv("BREVO_API_URL", "https://api.brevo.com/v3/smtp/email")
    n8n_ingest_token: str = os.getenv("N8N_INGEST_TOKEN", "")


settings = Settings()

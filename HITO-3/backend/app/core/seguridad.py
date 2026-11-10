"""HU-16 · Utilidades de seguridad: hash de contraseñas y tokens de sesión.

- Contraseñas: PBKDF2-HMAC-SHA256 con sal aleatoria (biblioteca estándar, sin dependencias
  nuevas). Formato guardado: pbkdf2_sha256$<iteraciones>$<sal_b64>$<hash_b64>.
- Tokens: valores aleatorios de 256 bits. En la base solo se guarda su SHA-256, así que
  una copia de la tabla `sesiones` no permite usar las sesiones.
"""

import base64
import hashlib
import hmac
import secrets

from app.core.config import settings

ALGORITMO = "pbkdf2_sha256"


def _b64(datos: bytes) -> str:
    return base64.b64encode(datos).decode("ascii")


def hashear_password(password: str, iteraciones: int | None = None) -> str:
    iteraciones = iteraciones or settings.hash_iteraciones
    sal = secrets.token_bytes(16)
    derivado = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), sal, iteraciones)
    return f"{ALGORITMO}${iteraciones}${_b64(sal)}${_b64(derivado)}"


def verificar_password(password: str, guardado: str | None) -> bool:
    """Compara en tiempo constante. Un hash con otro formato (p. ej. el marcador
    'demo-sin-contrasena' de las semillas) nunca es válido."""
    try:
        algoritmo, iteraciones, sal, esperado = (guardado or "").split("$")
        if algoritmo != ALGORITMO:
            return False
        derivado = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), base64.b64decode(sal), int(iteraciones))
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(derivado, base64.b64decode(esperado))


# Hash de relleno: si el correo no existe se verifica igual contra él, para que el tiempo
# de respuesta no delate qué correos tienen cuenta.
_HASH_RELLENO = hashear_password(secrets.token_urlsafe(16), iteraciones=settings.hash_iteraciones)


def verificar_password_o_relleno(password: str, guardado: str | None) -> bool:
    if guardado is None:
        verificar_password(password, _HASH_RELLENO)
        return False
    return verificar_password(password, guardado)


def nuevo_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

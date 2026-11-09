"""Ayuda para las pruebas unitarias heredadas (tests_hu17/18/20/27) tras el cierre de H-01/H-02.

Antes esas pruebas declaraban el rol con el encabezado X-Rol, que el servidor ya no acepta como
prueba de identidad. Ahora inician sesión de verdad (POST /auth/login) con cuentas FICTICIAS
creadas en la base SQLite de la prueba y usan el token Bearer.

    from tests_sesiones import preparar_sesiones
    SESION = preparar_sesiones(client, TestingSessionLocal)
    client.post(url, json=..., headers=SESION["direccion"])

Roles disponibles: "direccion" (administrador), "organizador" y "apoderado".
"""

import os
import secrets

os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("HASH_ITERACIONES", "1000")

from app.core.seguridad import hashear_password  # noqa: E402
from app.db.models import Apoderado, Usuario  # noqa: E402
from app.services import auditoria  # noqa: E402


class _BitacoraNula:
    """Las pruebas unitarias no tienen MongoDB: la bitácora se descarta sin esperar conexión."""

    def insert_one(self, _documento):
        return None


auditoria.coleccion = lambda: _BitacoraNula()

CUENTAS = {
    "direccion": ("direccion.prueba@jardin-ficticio.cl", "administrador"),
    "organizador": ("educadora.prueba@jardin-ficticio.cl", "organizador"),
    "apoderado": ("apoderado.prueba@jardin-ficticio.cl", "apoderado"),
}


def preparar_sesiones(client, SesionLocal) -> dict:
    """Crea (si no existen) las tres cuentas ficticias, inicia sesión y devuelve sus encabezados."""
    clave = secrets.token_urlsafe(12)  # aleatoria en cada ejecución; nunca se guarda
    with SesionLocal() as db:
        for email, rol in CUENTAS.values():
            usuario = db.query(Usuario).filter_by(email=email).one_or_none()
            if usuario is None:
                apoderado_id = None
                if rol == "apoderado":
                    apoderado = Apoderado(nombre="Apoderado Prueba", email=email)
                    db.add(apoderado)
                    db.flush()
                    apoderado_id = apoderado.id
                usuario = Usuario(email=email, rol=rol, apoderado_id=apoderado_id, password_hash="")
                db.add(usuario)
            usuario.password_hash = hashear_password(clave)
        db.commit()

    sesiones = {}
    for nombre, (email, _rol) in CUENTAS.items():
        r = client.post("/api/v1/auth/login", json={"email": email, "password": clave})
        assert r.status_code == 200, r.text
        sesiones[nombre] = {"Authorization": f"Bearer {r.json()['token']}"}
    return sesiones

"""Funciones compartidas por los scripts de prueba (scripts/prueba_*.py).

Los scripts se ejecutan DENTRO del contenedor de la API, por ejemplo:
    docker compose exec api python -m scripts.prueba_hu19
"""

import json
import os
import sys
import time
import urllib.error
import urllib.request

URL = "http://localhost:8000"
resultados = []

# Cierre H-01/H-02 (Sprint 3): las rutas heredadas exigen identidad real. Si DEMO_PASSWORD está
# definida (cuentas ficticias @ejemplo.cl en development/test), `usuario=<id>` inicia sesión con
# esa cuenta y envía el token Bearer; si no, se usa el encabezado demo X-Usuario-Id (solo sirve
# con PERMITIR_IDENTIDAD_DEMO=true). Así los scripts también pasan en modo estricto.
_SIN_INDICAR = object()
_tokens = {}
_por_defecto = {"usuario": None}


def identidad_por_defecto(email):
    """Usa la cuenta `email` en las llamadas que no indiquen `usuario` (p. ej. dirección demo)."""
    from sqlalchemy import select

    from app.db.models import Usuario
    from app.db.postgres import SessionLocal

    with SessionLocal() as db:
        _por_defecto["usuario"] = db.scalar(select(Usuario.id).where(Usuario.email == email))
    return _por_defecto["usuario"]


def _token_de(usuario_id):
    clave = os.environ.get("DEMO_PASSWORD", "")
    if not clave:
        return None
    if usuario_id not in _tokens:
        from app.db.models import Usuario
        from app.db.postgres import SessionLocal

        with SessionLocal() as db:
            cuenta = db.get(Usuario, int(usuario_id))
        if cuenta is None:
            return None
        datos = json.dumps({"email": cuenta.email, "password": clave}).encode()
        solicitud = urllib.request.Request(URL + "/api/v1/auth/login", data=datos, method="POST",
                                           headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(solicitud, timeout=15) as respuesta:
                _tokens[usuario_id] = json.loads(respuesta.read())["token"]
        except urllib.error.HTTPError:
            return None
    return _tokens[usuario_id]


def llamar(metodo, ruta, cuerpo=None, usuario=_SIN_INDICAR):
    """Llama a la API y devuelve (código HTTP, respuesta JSON).
    usuario: id de la cuenta que hace la llamada; None = sin identificarse; sin indicar = la
    identidad por defecto del script (si se definió con identidad_por_defecto)."""
    if usuario is _SIN_INDICAR:
        usuario = _por_defecto["usuario"]
    encabezados = {"Content-Type": "application/json"}
    if usuario:
        token = _token_de(usuario)
        if token:
            encabezados["Authorization"] = f"Bearer {token}"
        else:
            encabezados["X-Usuario-Id"] = str(usuario)
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    solicitud = urllib.request.Request(URL + ruta, data=datos, method=metodo, headers=encabezados)
    try:
        with urllib.request.urlopen(solicitud, timeout=15) as respuesta:
            return respuesta.status, json.loads(respuesta.read() or b"null")
    except urllib.error.HTTPError as error:
        return error.code, json.loads(error.read() or b"null")


def verificar(caso, descripcion, condicion, detalle=""):
    estado = "PASS" if condicion else "FAIL"
    resultados.append(estado)
    print(f"[{estado}] {caso} {descripcion}" + (f"  ->  {detalle}" if detalle else ""))


def esperar_api(segundos=30):
    """Espera a que la API responda (útil justo después de reiniciar los contenedores)."""
    for _ in range(segundos):
        try:
            llamar("GET", "/health")
            return
        except OSError:
            time.sleep(1)
    print(f"La API no responde en {URL}. ¿Está levantado docker compose?")
    sys.exit(2)


def terminar():
    fallidas = resultados.count("FAIL")
    print(f"\nResultado: {len(resultados) - fallidas}/{len(resultados)} PASS")
    sys.exit(1 if fallidas else 0)

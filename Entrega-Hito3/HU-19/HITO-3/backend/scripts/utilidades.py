"""Funciones compartidas por los scripts de prueba (scripts/prueba_*.py).

Los scripts se ejecutan DENTRO del contenedor de la API, por ejemplo:
    docker compose exec api python -m scripts.prueba_hu19
"""

import json
import sys
import time
import urllib.error
import urllib.request

URL = "http://localhost:8000"
resultados = []


def llamar(metodo, ruta, cuerpo=None, usuario=None):
    """Llama a la API y devuelve (código HTTP, respuesta JSON)."""
    encabezados = {"Content-Type": "application/json"}
    if usuario:
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

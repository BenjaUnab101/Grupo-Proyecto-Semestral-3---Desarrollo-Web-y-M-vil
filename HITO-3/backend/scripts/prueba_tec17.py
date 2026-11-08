"""TEC-17 · Endpoints que usa React: sesión demo, cupos, inscripciones y CORS.

    docker compose exec api python -m scripts.prueba_tec17

Solo LEE datos (no crea ni borra nada). Todo es ficticio (@ejemplo.cl, DEMO-*).
"""

import urllib.request

from scripts.utilidades import URL, esperar_api, llamar, terminar, verificar

esperar_api()

print("== Sesión demo ==")
st, cuentas = llamar("GET", "/api/v1/sesion/cuentas-demo")
verificar("T17-01", "Lista solo cuentas ficticias (@ejemplo.cl)", st == 200 and all(c["email"].endswith("@ejemplo.cl") for c in cuentas), f"{len(cuentas)} cuentas")
verificar("T17-02", "Hay cuentas de apoderado, personal y dirección", {"apoderado", "organizador", "administrador"} <= {c["rol"] for c in cuentas})
st, _ = llamar("GET", "/api/v1/sesion/yo")
verificar("T17-03", "/sesion/yo sin X-Usuario-Id -> 401", st == 401)
st, _ = llamar("GET", "/api/v1/sesion/yo", usuario=999999)
verificar("T17-04", "/sesion/yo con una cuenta inexistente -> 401", st == 401)
apoderado = next(c for c in cuentas if c["email"] == "apoderado.demo1@ejemplo.cl")
st, perfil = llamar("GET", "/api/v1/sesion/yo", usuario=apoderado["usuario_id"])
verificar("T17-05", "Perfil de apoderado con sus hijos ficticios",
          st == 200 and perfil["apoderado_id"] and all(h["codigo"].startswith("DEMO-") for h in perfil["hijos"]), f"{len(perfil['hijos'])} hijos")

print("\n== Cupos por sala (HU-09) ==")
st, salas = llamar("GET", "/api/v1/salas/cupos")
esperados = {"Sala Naranja (Medio Mayor A)": 15, "Sala Azul (Medio Mayor B)": 13, "Sala Amarilla (Pre-Kínder B)": 8, "Sala Fonoaudiología 2": 14}
matriculados = {s["nombre"]: s["matriculados"] for s in salas}
verificar("T17-06", "Los matriculados se cuentan en SQL (mismos números de HU-09)", st == 200 and all(matriculados.get(n) == m for n, m in esperados.items()), f"{len(salas)} salas")
verificar("T17-07", "cupos_disponibles = capacidad - matriculados", all(s["cupos_disponibles"] == max(s["capacidad"] - s["matriculados"], 0) for s in salas))

print("\n== Inscripciones del apoderado (HU-19) ==")
st, lista = llamar("GET", f"/api/v1/apoderados/{perfil['apoderado_id']}/inscripciones")
hijos = {h["id"] for h in perfil["hijos"]}
verificar("T17-08", "Solo trae inscripciones de sus hijos", st == 200 and all(i["alumno_id"] in hijos for i in lista))
st, _ = llamar("GET", "/api/v1/apoderados/999999/inscripciones")
verificar("T17-09", "Apoderado inexistente -> 404", st == 404)

print("\n== CORS para React ==")
solicitud = urllib.request.Request(URL + "/api/v1/comunicados", method="OPTIONS", headers={
    "Origin": "http://localhost:5173",
    "Access-Control-Request-Method": "POST",
    "Access-Control-Request-Headers": "content-type,x-usuario-id",
})
with urllib.request.urlopen(solicitud) as respuesta:
    permitidos = respuesta.headers.get("access-control-allow-headers", "").lower()
verificar("T17-10", "El navegador puede enviar X-Usuario-Id desde http://localhost:5173", "x-usuario-id" in permitidos, permitidos)
terminar()

"""Sprint 3 · Daniel · Pruebas de integración contra PostgreSQL y MongoDB REALES.

Cubre HU-16 (login/portal), HU-22 (bitácora Mongo), HU-24 (panel) y HU-26 (contacto).
Se ejecuta DENTRO del contenedor de la API, con DEMO_PASSWORD definida en el entorno:

    docker compose exec api python -m scripts.prueba_s3_daniel crear
    docker compose restart                       # reinicio NO destructivo (sin -v)
    docker compose exec api python -m scripts.prueba_s3_daniel verificar

'crear' deja una consulta de contacto y eventos Mongo, y guarda sus ids en
/tmp/prueba_s3_daniel.json; 'verificar' comprueba que siguen ahí tras el reinicio.
Todos los datos son ficticios (@ejemplo.cl, DEMO-*).
"""

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

from scripts.utilidades import URL, esperar_api, terminar, verificar

ARCHIVO = Path("/tmp/prueba_s3_daniel.json")
CLAVE = os.environ.get("DEMO_PASSWORD", "")
API = "/api/v1"


def llamar(metodo, ruta, cuerpo=None, token=None, encabezados=None):
    cabeceras = {"Content-Type": "application/json", **(encabezados or {})}
    if token:
        cabeceras["Authorization"] = f"Bearer {token}"
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    solicitud = urllib.request.Request(URL + API + ruta, data=datos, method=metodo, headers=cabeceras)
    try:
        with urllib.request.urlopen(solicitud, timeout=15) as respuesta:
            return respuesta.status, json.loads(respuesta.read() or b"null")
    except urllib.error.HTTPError as error:
        return error.code, json.loads(error.read() or b"null")


def entrar(email):
    st, cuerpo = llamar("POST", "/auth/login", {"email": email, "password": CLAVE})
    return cuerpo["token"] if st == 200 else None


def crear():
    print("== HU-16 · Login real, sesión y logout ==")
    st, _ = llamar("POST", "/auth/login", {"email": "apoderado.demo1@ejemplo.cl", "password": "clave-incorrecta"})
    verificar("S3-01", "Login con contraseña incorrecta -> 401", st == 401)
    st, login = llamar("POST", "/auth/login", {"email": "apoderado.demo1@ejemplo.cl", "password": CLAVE})
    verificar("S3-02", "Login válido -> 200 con token Bearer", st == 200 and login.get("tipo") == "bearer")
    ap1 = login["token"]
    st, _ = llamar("GET", "/auth/yo")
    verificar("S3-03", "Sin token -> 401", st == 401)

    print("\n== HU-16 · Portal: hijos desde SQL y acceso cruzado ==")
    st, hijos = llamar("GET", "/portal/alumnos", token=ap1)
    verificar("S3-04", "Apoderado Demo Uno ve sus 5 hijos (relación SQL)", st == 200 and len(hijos) == 5, f"{len(hijos)} hijos")
    ap2 = entrar("apoderado.demo2@ejemplo.cl")
    st, hijos2 = llamar("GET", "/portal/alumnos", token=ap2)
    verificar("S3-05", "Apoderado Demo Dos ve 1 hijo", st == 200 and len(hijos2) == 1)
    ap3 = entrar("apoderado.demo3@ejemplo.cl")
    st, hijos3 = llamar("GET", "/portal/alumnos", token=ap3)
    verificar("S3-06", "Apoderade Demo Tres (sin hijos) -> lista vacía", st == 200 and hijos3 == [])
    st, _ = llamar("GET", f"/portal/alumnos/{hijos2[0]['id']}", token=ap1)
    verificar("S3-07", "Ficha de un hijo AJENO -> 403 (IDOR bloqueado)", st == 403)
    st, ficha = llamar("GET", f"/portal/alumnos/{hijos[0]['id']}", token=ap1)
    verificar("S3-08", "Ficha de un hijo propio -> 200", st == 200 and ficha["id"] == hijos[0]["id"])
    direccion = entrar("direccion.demo@ejemplo.cl")
    st, _ = llamar("GET", "/portal/alumnos", token=direccion)
    verificar("S3-09", "Dirección no usa el portal de familias -> 403", st == 403)

    print("\n== HU-26 · Contacto con dirección en PostgreSQL ==")
    consulta = {"nombre": "Apoderada Demo Uno", "correo": "apoderado.demo1@ejemplo.cl", "telefono": "+56 9 1234 5678",
                "asunto": "Prueba S3 Daniel", "mensaje": "Consulta ficticia de prueba de integración."}
    st, _ = llamar("POST", "/contacto", {**consulta, "mensaje": "corto"})
    verificar("S3-10", "Mensaje muy corto -> 400", st == 400)
    st, creada = llamar("POST", "/contacto", consulta, token=ap1)
    verificar("S3-11", "Consulta creada -> 201 con código CT-", st == 201 and creada["codigo"].startswith("CT-"), creada.get("codigo", ""))
    st, _ = llamar("PATCH", f"/contacto/{creada['id']}/estado", {"estado": "cerrado"}, token=ap1)
    verificar("S3-12", "Apoderado intenta cambiar el estado -> 403", st == 403)
    st, cambio = llamar("PATCH", f"/contacto/{creada['id']}/estado", {"estado": "en_gestion", "respuesta_direccion": "Recibida"}, token=direccion)
    verificar("S3-13", "Dirección pasa la consulta a en_gestion -> 200", st == 200 and cambio["estado"] == "en_gestion")
    st, mias = llamar("GET", "/contacto/mias", token=ap2)
    verificar("S3-14", "Otro apoderado no ve esa consulta", st == 200 and all(c["codigo"] != creada["codigo"] for c in mias))

    print("\n== HU-22 / HU-24 · Inscripción -> evento Mongo -> panel ==")
    st, eventos = llamar("GET", "/eventos")
    taller = next(e for e in eventos if e["codigo"] == "DEMO-TALLER-RECICLAJE")
    hijo = hijos[-1]
    st, inscripcion = llamar("POST", f"/eventos/{taller['id']}/inscripciones", {"alumno_id": hijo["id"]}, token=ap1)
    if st == 409:  # ya estaba inscrito por una ejecución anterior: se cancela y se vuelve a inscribir
        st, lista = llamar("GET", f"/apoderados/{login['perfil']['apoderado_id']}/inscripciones", token=ap1)
        previa = next(i for i in lista if i["actividad_id"] == taller["id"] and i["alumno_id"] == hijo["id"])
        llamar("POST", f"/inscripciones/{previa['id']}/cancelar", {}, token=ap1)
        st, inscripcion = llamar("POST", f"/eventos/{taller['id']}/inscripciones", {"alumno_id": hijo["id"]}, token=ap1)
    verificar("S3-15", "Inscripción real a un evento -> 201", st == 201)
    st, historial = llamar("GET", f"/panel/participacion/historial?actividad_id={taller['id']}", token=direccion)
    verificar("S3-16", "El historial Mongo del evento muestra la inscripción",
              st == 200 and historial["items"] and historial["items"][0]["tipo"] == "inscripcion_creada")
    st, panel = llamar("GET", f"/panel/participacion?actividad_id={taller['id']}", token=direccion)
    fila = panel["actividades"][0] if st == 200 else {}
    _, evento = llamar("GET", f"/eventos/{taller['id']}")  # conteo de HU-19 (otra consulta SQL)
    verificar("S3-17", "Panel: inscritos y cupos coinciden con el conteo de HU-19",
              st == 200 and fila["inscritos"] == evento["inscritos"] >= 1 and fila["cupos_disponibles"] == evento["cupos_disponibles"],
              f"inscritos={fila.get('inscritos')} ocupación={fila.get('ocupacion_pct')}%")
    st, _ = llamar("GET", "/panel/participacion", token=ap1)
    verificar("S3-18", "Apoderado no ve el panel -> 403", st == 403)
    st, audit = llamar("GET", "/auditoria/eventos?tipo=acceso_denegado&tamano=5", token=direccion)
    verificar("S3-19", "Bitácora registra el intento de acceso cruzado", st == 200 and audit["total"] >= 1)
    st, audit_ap = llamar("GET", "/auditoria/eventos", token=ap1)
    verificar("S3-20", "Apoderado no consulta la bitácora -> 403", st == 403)

    print("\n== HU-16 · Logout real ==")
    st, _ = llamar("POST", "/auth/logout", token=ap1)
    verificar("S3-21", "Logout -> 204", st == 204)
    st, _ = llamar("GET", "/portal/alumnos", token=ap1)
    verificar("S3-22", "El token cerrado ya no sirve -> 401", st == 401)

    st, total = llamar("GET", "/auditoria/eventos?tamano=1", token=direccion)
    ARCHIVO.write_text(json.dumps({"codigo": creada["codigo"], "correo": consulta["correo"], "eventos_mongo": total["total"]}))
    print(f"\nGuardado {ARCHIVO}: consulta {creada['codigo']}, {total['total']} eventos en MongoDB")


def verificar_tras_reinicio():
    previo = json.loads(ARCHIVO.read_text())
    print("== Persistencia tras reinicio ==")
    st, seg = llamar("POST", "/contacto/seguimiento", {"codigo": previo["codigo"], "correo": previo["correo"]})
    verificar("S3-P1", "La consulta de contacto sigue en PostgreSQL con su estado", st == 200 and seg["estado"] == "en_gestion", previo["codigo"])
    direccion = entrar("direccion.demo@ejemplo.cl")
    st, total = llamar("GET", "/auditoria/eventos?tamano=1", token=direccion)
    verificar("S3-P2", "Los eventos de MongoDB siguen ahí (más el login nuevo)", st == 200 and total["total"] >= previo["eventos_mongo"], f"{total.get('total')} >= {previo['eventos_mongo']}")
    st, panel = llamar("GET", "/panel/participacion", token=direccion)
    verificar("S3-P3", "El panel responde con agregaciones SQL", st == 200 and panel["totales"]["actividades"] >= 3)


if __name__ == "__main__":
    if not CLAVE:
        print("Falta DEMO_PASSWORD en el entorno del contenedor de la API.")
        sys.exit(2)
    esperar_api()
    {"crear": crear, "verificar": verificar_tras_reinicio}[sys.argv[1] if len(sys.argv) > 1 else "crear"]()
    terminar()

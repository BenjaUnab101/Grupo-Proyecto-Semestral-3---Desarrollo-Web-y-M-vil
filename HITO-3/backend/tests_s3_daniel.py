"""Sprint 3 · Daniel · Pruebas unitarias/de API de HU-16, HU-22, HU-24 y HU-26.

    python -m unittest tests_s3_daniel -v

Usan SQLite en memoria y una colección MongoDB FALSA en memoria (misma interfaz que pymongo
para lo que usa app/services/auditoria.py). Las pruebas contra PostgreSQL y MongoDB reales
están en scripts/prueba_s3_daniel.py (se ejecutan dentro de docker compose).
Todos los datos son ficticios (@ejemplo.cl, DEMO-*).
"""

import os

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["HASH_ITERACIONES"] = "1000"  # rápido en pruebas; en la app real son 310.000
# R4 · Matiz A: el entorno se declara explícitamente (sin APP_ENV la app no inicia). Estas
# pruebas usan "test" y piden la identidad demo de forma explícita para cubrir ese modo.
os.environ["APP_ENV"] = "test"
os.environ["PERMITIR_IDENTIDAD_DEMO"] = "true"

import unittest
from datetime import date, datetime, timedelta, timezone

from pymongo.errors import ServerSelectionTimeoutError
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.core.seguridad import hash_token, hashear_password, verificar_password
from app.db.models import Actividad, Alumno, Apoderado, ApoderadoAlumno, ConsultaContacto, Inscripcion, Matricula, Sala, Sesion, Usuario
from app.db.postgres import Base, get_db
from app.main import app
from app.services import auditoria

engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
SesionPrueba = sessionmaker(bind=engine, autoflush=False, autocommit=False)
CLAVE = "Clave-Prueba-123"  # ficticia, solo para estas pruebas


def obtener_db():
    db = SesionPrueba()
    try:
        yield db
    finally:
        db.close()


class ColeccionFalsa:
    """Imita insert_one / count_documents / find().sort().skip().limit() de pymongo."""

    def __init__(self):
        self.docs, self.caida = [], False

    def _revisar(self):
        if self.caida:
            raise ServerSelectionTimeoutError("MongoDB caído (simulado)")

    def insert_one(self, doc):
        self._revisar()
        # Como pymongo real: las fechas vuelven en UTC pero SIN zona (tz_aware=False).
        self.docs.append({**doc, "fecha": doc["fecha"].replace(tzinfo=None), "_id": f"id{len(self.docs):04d}"})

    @staticmethod
    def _valor(doc, ruta):
        for parte in ruta.split("."):
            doc = (doc or {}).get(parte) if isinstance(doc, dict) else None
        return doc

    def _cumple(self, doc, filtro):
        for ruta, condicion in filtro.items():
            valor = self._valor(doc, ruta)
            if isinstance(valor, datetime) and valor.tzinfo is None:
                valor = valor.replace(tzinfo=timezone.utc)  # MongoDB compara todo en UTC
            if isinstance(condicion, dict):
                if "$in" in condicion and valor not in condicion["$in"]:
                    return False
                if "$gte" in condicion and not valor >= condicion["$gte"]:
                    return False
                if "$lt" in condicion and not valor < condicion["$lt"]:
                    return False
            elif valor != condicion:
                return False
        return True

    def count_documents(self, filtro):
        self._revisar()
        return sum(1 for d in self.docs if self._cumple(d, filtro))

    def find(self, filtro):
        self._revisar()
        coleccion = self

        class Cursor:
            def __init__(self):
                self.lista = [d for d in coleccion.docs if coleccion._cumple(d, filtro)]

            def sort(self, _orden):
                self.lista.sort(key=lambda d: (d["fecha"], d["_id"]), reverse=True)
                return self

            def skip(self, n):
                self.lista = self.lista[n:]
                return self

            def limit(self, n):
                self.lista = self.lista[:n]
                return self

            def __iter__(self):
                return iter(self.lista)

        return Cursor()


MONGO = ColeccionFalsa()
auditoria.coleccion = lambda: MONGO
app.dependency_overrides[get_db] = obtener_db
cliente = TestClient(app)


def crear_datos():
    """Datos ficticios: apoderado con 2 hijos, apoderado con 1 hijo, apoderado sin hijos,
    dirección y personal; dos actividades (una sin inscritos)."""
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    MONGO.docs.clear()
    MONGO.caida = False
    with SesionPrueba() as db:
        ap1, ap2, ap3 = (Apoderado(nombre=f"Apoderado Demo {n}", email=f"ap{n}@ejemplo.cl") for n in (1, 2, 3))
        db.add_all([ap1, ap2, ap3])
        db.flush()
        hijos = [Alumno(codigo=f"DEMO-T{n}", nombre=f"Alumno Demo T{n}") for n in (1, 2, 3)]
        db.add_all(hijos)
        sala = Sala(nombre="Sala Demo", nivel="Kínder", capacidad=15)
        db.add(sala)
        db.flush()
        db.add_all([
            ApoderadoAlumno(apoderado_id=ap1.id, alumno_id=hijos[0].id, parentesco="Madre"),
            ApoderadoAlumno(apoderado_id=ap1.id, alumno_id=hijos[1].id, parentesco="Madre"),
            ApoderadoAlumno(apoderado_id=ap2.id, alumno_id=hijos[2].id, parentesco="Padre"),
            Matricula(alumno_id=hijos[0].id, sala_id=sala.id, anio_escolar=2026, estado="vigente"),
        ])
        hash_clave = hashear_password(CLAVE)
        db.add_all([
            Usuario(email="ap1@ejemplo.cl", password_hash=hash_clave, rol="apoderado", apoderado_id=ap1.id),
            Usuario(email="ap2@ejemplo.cl", password_hash=hash_clave, rol="apoderado", apoderado_id=ap2.id),
            Usuario(email="ap3@ejemplo.cl", password_hash=hash_clave, rol="apoderado", apoderado_id=ap3.id),
            Usuario(email="direccion@ejemplo.cl", password_hash=hash_clave, rol="administrador"),
            Usuario(email="educadora@ejemplo.cl", password_hash=hash_clave, rol="organizador"),
            Usuario(email="inactivo@ejemplo.cl", password_hash=hash_clave, rol="administrador", activo=False),
            Usuario(email="sinclave@ejemplo.cl", password_hash="demo-sin-contrasena", rol="administrador"),
            # Cuenta NO demo (otro dominio): nunca debe poder suplantarse con X-Usuario-Id.
            Usuario(email="direccion@jardin-ficticio.cl", password_hash=hash_clave, rol="administrador"),
        ])
        hoy = date(2026, 11, 8)
        a1 = Actividad(codigo="DEMO-P1", titulo="Taller demo", fecha=hoy + timedelta(days=5), cupo_maximo=2)
        a2 = Actividad(codigo="DEMO-P2", titulo="Salida demo", fecha=hoy + timedelta(days=40), cupo_maximo=10)
        db.add_all([a1, a2])
        db.flush()
        db.add_all([
            Inscripcion(actividad_id=a1.id, alumno_id=hijos[0].id, apoderado_id=ap1.id, estado="inscrita"),
            Inscripcion(actividad_id=a1.id, alumno_id=hijos[2].id, apoderado_id=ap2.id, estado="inscrita"),
            Inscripcion(actividad_id=a1.id, alumno_id=hijos[1].id, apoderado_id=ap1.id, estado="cancelada"),
        ])
        db.commit()
        return {"hijos": [h.id for h in hijos], "actividades": (a1.id, a2.id)}


def login(email, clave=CLAVE):
    return cliente.post("/api/v1/auth/login", json={"email": email, "password": clave})


def token(email):
    respuesta = login(email)
    assert respuesta.status_code == 200, respuesta.text
    return {"Authorization": f"Bearer {respuesta.json()['token']}"}


# ---------------------------------------------------------------------------
# HU-16 · SCRUM-121: login, hash, sesión y logout
# ---------------------------------------------------------------------------


class TestHU16Autenticacion(unittest.TestCase):
    def setUp(self):
        self.datos = crear_datos()

    def test_hash_pbkdf2_con_sal_y_verificacion(self):
        h1, h2 = hashear_password("x-Clave-1"), hashear_password("x-Clave-1")
        self.assertTrue(h1.startswith("pbkdf2_sha256$"))
        self.assertNotEqual(h1, h2)  # sal aleatoria
        self.assertTrue(verificar_password("x-Clave-1", h1))
        self.assertFalse(verificar_password("x-clave-1", h1))
        self.assertFalse(verificar_password("demo-sin-contrasena", "demo-sin-contrasena"))

    def test_login_valido_entrega_token_y_perfil_con_hijos_sql(self):
        r = login("AP1@ejemplo.cl ")  # mayúsculas y espacios se normalizan
        self.assertEqual(r.status_code, 200)
        cuerpo = r.json()
        self.assertEqual(cuerpo["tipo"], "bearer")
        self.assertEqual(cuerpo["perfil"]["rol"], "apoderado")
        self.assertEqual(len(cuerpo["perfil"]["hijos"]), 2)
        self.assertNotIn("password_hash", r.text)
        with SesionPrueba() as db:  # en la base solo queda el SHA-256 del token
            sesion = db.scalar(select(Sesion))
            self.assertEqual(sesion.token_hash, hash_token(cuerpo["token"]))
            self.assertNotIn(cuerpo["token"], sesion.token_hash)

    def test_login_invalido_401_generico(self):
        for email, clave in (("ap1@ejemplo.cl", "mala"), ("noexiste@ejemplo.cl", CLAVE),
                             ("inactivo@ejemplo.cl", CLAVE), ("sinclave@ejemplo.cl", "demo-sin-contrasena")):
            r = login(email, clave)
            self.assertEqual(r.status_code, 401, email)
            self.assertEqual(r.json()["detail"], "Correo o contraseña incorrectos")

    def test_login_datos_invalidos_400(self):
        r = cliente.post("/api/v1/auth/login", json={"email": "no-es-correo", "password": ""})
        self.assertEqual(r.status_code, 400)

    def test_logout_revoca_el_token_en_el_servidor(self):
        cabecera = token("ap1@ejemplo.cl")
        self.assertEqual(cliente.get("/api/v1/auth/yo", headers=cabecera).status_code, 200)
        self.assertEqual(cliente.post("/api/v1/auth/logout", headers=cabecera).status_code, 204)
        self.assertEqual(cliente.get("/api/v1/auth/yo", headers=cabecera).status_code, 401)
        self.assertEqual(cliente.get("/api/v1/portal/alumnos", headers=cabecera).status_code, 401)

    def test_token_expirado_401(self):
        cabecera = token("ap1@ejemplo.cl")
        with SesionPrueba() as db:
            sesion = db.scalar(select(Sesion))
            sesion.expira_en = datetime.now(timezone.utc) - timedelta(minutes=1)
            db.commit()
        self.assertEqual(cliente.get("/api/v1/auth/yo", headers=cabecera).status_code, 401)

    def test_token_inventado_o_mal_formado_401(self):
        self.assertEqual(cliente.get("/api/v1/auth/yo", headers={"Authorization": "Bearer inventado"}).status_code, 401)
        self.assertEqual(cliente.get("/api/v1/auth/yo", headers={"Authorization": "Basic abc"}).status_code, 401)
        self.assertEqual(cliente.get("/api/v1/auth/yo").status_code, 401)

    def test_portal_no_acepta_identidad_demo_x_usuario_id(self):
        self.assertEqual(cliente.get("/api/v1/portal/alumnos", headers={"X-Usuario-Id": "1"}).status_code, 401)

    def test_login_queda_en_bitacora_sin_datos_sensibles(self):
        login("ap1@ejemplo.cl")
        login("ap1@ejemplo.cl", "mala")
        tipos = [(d["tipo"], d["resultado"]) for d in MONGO.docs]
        self.assertIn(("acceso_login", "exito"), tipos)
        self.assertIn(("acceso_login", "fallido"), tipos)
        texto = str(MONGO.docs)
        for sensible in (CLAVE, "mala", "ap1@ejemplo.cl", "password", "token"):
            self.assertNotIn(sensible, texto)


# ---------------------------------------------------------------------------
# HU-16 · SCRUM-122: 401/403, acceso cruzado (IDOR) y selector de hermanos
# ---------------------------------------------------------------------------


class TestHU16Autorizacion(unittest.TestCase):
    def setUp(self):
        self.datos = crear_datos()

    def test_selector_hermanos_0_1_y_2_hijos_desde_sql(self):
        for email, esperados in (("ap3@ejemplo.cl", 0), ("ap2@ejemplo.cl", 1), ("ap1@ejemplo.cl", 2)):
            r = cliente.get("/api/v1/portal/alumnos", headers=token(email))
            self.assertEqual(r.status_code, 200)
            self.assertEqual(len(r.json()), esperados, email)

    def test_ficha_de_hijo_propio_con_matricula_e_inscripciones(self):
        hijo = self.datos["hijos"][0]
        r = cliente.get(f"/api/v1/portal/alumnos/{hijo}", headers=token("ap1@ejemplo.cl"))
        self.assertEqual(r.status_code, 200)
        ficha = r.json()
        self.assertEqual(ficha["sala"], "Sala Demo")
        self.assertEqual(ficha["estado_matricula"], "vigente")
        self.assertEqual([i["estado"] for i in ficha["inscripciones"]], ["inscrita"])

    def test_acceso_cruzado_a_hijo_ajeno_403_y_queda_registrado(self):
        ajeno = self.datos["hijos"][2]  # hijo de ap2
        r = cliente.get(f"/api/v1/portal/alumnos/{ajeno}", headers=token("ap1@ejemplo.cl"))
        self.assertEqual(r.status_code, 403)
        self.assertNotIn("Alumno Demo T3", r.text)
        denegados = [d for d in MONGO.docs if d["tipo"] == "acceso_denegado"]
        self.assertEqual(denegados[-1]["recurso"], {"tipo": "alumno", "id": ajeno})

    def test_alumno_inexistente_tambien_403_para_no_revelar_ids(self):
        r = cliente.get("/api/v1/portal/alumnos/99999", headers=token("ap1@ejemplo.cl"))
        self.assertEqual(r.status_code, 403)

    def test_roles_sin_portal_403(self):
        for email in ("direccion@ejemplo.cl", "educadora@ejemplo.cl"):
            self.assertEqual(cliente.get("/api/v1/portal/alumnos", headers=token(email)).status_code, 403)

    def test_sin_sesion_401(self):
        self.assertEqual(cliente.get("/api/v1/portal/alumnos").status_code, 401)
        self.assertEqual(cliente.get(f"/api/v1/portal/alumnos/{self.datos['hijos'][0]}").status_code, 401)

    def test_token_tiene_prioridad_sobre_x_usuario_id(self):
        cabecera = {**token("ap2@ejemplo.cl"), "X-Usuario-Id": "4"}  # 4 = dirección
        r = cliente.get("/api/v1/sesion/yo", headers=cabecera)
        self.assertEqual(r.json()["rol"], "apoderado")


# ---------------------------------------------------------------------------
# HU-22 · SCRUM-126/127: escritura y consulta de la bitácora MongoDB
# ---------------------------------------------------------------------------


class TestHU22Auditoria(unittest.TestCase):
    def setUp(self):
        self.datos = crear_datos()
        self.dir = token("direccion@ejemplo.cl")

    def test_solo_direccion_consulta_la_bitacora(self):
        self.assertEqual(cliente.get("/api/v1/auditoria/eventos").status_code, 401)
        self.assertEqual(cliente.get("/api/v1/auditoria/eventos", headers=token("educadora@ejemplo.cl")).status_code, 403)
        self.assertEqual(cliente.get("/api/v1/auditoria/eventos", headers=token("ap1@ejemplo.cl")).status_code, 403)
        self.assertEqual(cliente.get("/api/v1/auditoria/eventos", headers=self.dir).status_code, 200)

    def test_filtros_y_paginacion(self):
        for _ in range(3):
            login("ap1@ejemplo.cl", "mala")
        r = cliente.get("/api/v1/auditoria/eventos", params={"tipo": "acceso_login", "resultado": "fallido", "tamano": 2}, headers=self.dir)
        cuerpo = r.json()
        self.assertEqual(r.status_code, 200)
        self.assertEqual((cuerpo["total"], len(cuerpo["items"])), (3, 2))
        segunda = cliente.get("/api/v1/auditoria/eventos", params={"tipo": "acceso_login", "resultado": "fallido", "tamano": 2, "pagina": 2}, headers=self.dir).json()
        self.assertEqual(len(segunda["items"]), 1)
        fechas = [i["fecha"] for i in cuerpo["items"]]
        self.assertEqual(fechas, sorted(fechas, reverse=True))  # más nuevo primero
        self.assertTrue(all(f.endswith(("Z", "+00:00")) for f in fechas))  # UTC explícito para React

    def test_filtro_por_fecha_y_validaciones(self):
        hoy = datetime.now(timezone.utc).date()
        r = cliente.get("/api/v1/auditoria/eventos", params={"desde": str(hoy), "hasta": str(hoy)}, headers=self.dir)
        self.assertGreaterEqual(r.json()["total"], 1)  # al menos el login de dirección
        futuro = cliente.get("/api/v1/auditoria/eventos", params={"desde": str(hoy + timedelta(days=1))}, headers=self.dir)
        self.assertEqual(futuro.json()["total"], 0)
        self.assertEqual(cliente.get("/api/v1/auditoria/eventos", params={"desde": "2026-12-01", "hasta": "2026-11-01"}, headers=self.dir).status_code, 400)
        self.assertEqual(cliente.get("/api/v1/auditoria/eventos", params={"tipo": "inventado"}, headers=self.dir).status_code, 400)
        self.assertEqual(cliente.get("/api/v1/auditoria/eventos", params={"tamano": 500}, headers=self.dir).status_code, 400)

    def test_mongo_caido_lectura_503_y_escritura_no_rompe_el_negocio(self):
        MONGO.caida = True
        self.assertEqual(cliente.get("/api/v1/auditoria/eventos", headers=self.dir).status_code, 503)
        # El login (operación de negocio en SQL) funciona aunque la bitácora no responda.
        self.assertEqual(login("ap1@ejemplo.cl").status_code, 200)

    def test_datos_no_permitidos_se_descartan(self):
        auditoria.registrar("contacto_creado", datos={"estado_nuevo": "nuevo", "correo": "x@ejemplo.cl", "rut": "1-9"})
        self.assertEqual(MONGO.docs[-1]["datos"], {"estado_nuevo": "nuevo"})
        with self.assertRaises(ValueError):
            auditoria.registrar("tipo_inventado")


# ---------------------------------------------------------------------------
# HU-26 · SCRUM-114: contacto con dirección persistido y estados
# ---------------------------------------------------------------------------

CONSULTA = {"nombre": "Apoderado Demo", "correo": "Demo@Ejemplo.cl", "telefono": "+56 9 1234 5678",
            "asunto": "Horario de salida", "mensaje": "¿Cuál es el horario de salida del viernes?"}


class TestHU26Contacto(unittest.TestCase):
    def setUp(self):
        crear_datos()
        self.dir = token("direccion@ejemplo.cl")

    def test_visitante_crea_201_con_codigo_y_consulta_seguimiento(self):
        r = cliente.post("/api/v1/contacto", json=CONSULTA)
        self.assertEqual(r.status_code, 201)
        creada = r.json()
        self.assertRegex(creada["codigo"], r"^CT-[2-9A-HJ-NP-Z]{6}$")
        self.assertEqual(creada["estado"], "nuevo")
        seg = cliente.post("/api/v1/contacto/seguimiento", json={"codigo": creada["codigo"].lower(), "correo": "demo@ejemplo.cl"})
        self.assertEqual(seg.status_code, 200)
        self.assertNotIn("telefono", seg.json())  # quien consulta no ve datos de contacto
        otro = cliente.post("/api/v1/contacto/seguimiento", json={"codigo": creada["codigo"], "correo": "otro@ejemplo.cl"})
        self.assertEqual(otro.status_code, 404)
        with SesionPrueba() as db:
            guardada = db.get(ConsultaContacto, creada["id"])
            self.assertEqual((guardada.correo, guardada.telefono, guardada.usuario_id), ("demo@ejemplo.cl", "912345678", None))

    def test_validaciones_400(self):
        for campo, valor in (("mensaje", "corto"), ("telefono", "123"), ("correo", "sin-arroba"), ("asunto", "")):
            r = cliente.post("/api/v1/contacto", json={**CONSULTA, campo: valor})
            self.assertEqual(r.status_code, 400, campo)
            self.assertTrue(any(e["campo"].endswith(campo) for e in r.json()["errores"]))

    def test_apoderado_ve_solo_sus_consultas(self):
        ap1, ap2 = token("ap1@ejemplo.cl"), token("ap2@ejemplo.cl")
        cliente.post("/api/v1/contacto", json=CONSULTA, headers=ap1)
        cliente.post("/api/v1/contacto", json={**CONSULTA, "asunto": "Otra"}, headers=ap2)
        mias = cliente.get("/api/v1/contacto/mias", headers=ap1).json()
        self.assertEqual([c["asunto"] for c in mias], ["Horario de salida"])
        self.assertEqual(cliente.get("/api/v1/contacto/mias").status_code, 401)

    def test_solo_direccion_lista_y_cambia_estado(self):
        creada = cliente.post("/api/v1/contacto", json=CONSULTA).json()
        for cabecera, esperado in ((None, 401), (token("ap1@ejemplo.cl"), 403), (token("educadora@ejemplo.cl"), 403)):
            self.assertEqual(cliente.get("/api/v1/contacto", headers=cabecera).status_code, esperado)
            r = cliente.patch(f"/api/v1/contacto/{creada['id']}/estado", json={"estado": "cerrado"}, headers=cabecera)
            self.assertEqual(r.status_code, esperado)

        r = cliente.patch(f"/api/v1/contacto/{creada['id']}/estado", json={"estado": "en_gestion", "respuesta_direccion": "Lo revisamos"}, headers=self.dir)
        self.assertEqual((r.status_code, r.json()["estado"]), (200, "en_gestion"))
        self.assertEqual(len(cliente.get("/api/v1/contacto", params={"estado": "en_gestion"}, headers=self.dir).json()), 1)
        self.assertEqual(cliente.get("/api/v1/contacto", params={"estado": "nuevo"}, headers=self.dir).json(), [])
        cerrar = cliente.patch(f"/api/v1/contacto/{creada['id']}/estado", json={"estado": "cerrado"}, headers=self.dir)
        self.assertEqual(cerrar.json()["respuesta_direccion"], "Lo revisamos")  # se conserva si no se envía
        reabrir = cliente.patch(f"/api/v1/contacto/{creada['id']}/estado", json={"estado": "nuevo"}, headers=self.dir)
        self.assertEqual(reabrir.status_code, 409)
        self.assertEqual(cliente.patch(f"/api/v1/contacto/{creada['id']}/estado", json={"estado": "inventado"}, headers=self.dir).status_code, 400)
        self.assertEqual(cliente.patch("/api/v1/contacto/9999/estado", json={"estado": "cerrado"}, headers=self.dir).status_code, 404)
        cambios = [d["datos"] for d in MONGO.docs if d["tipo"] == "contacto_estado_cambiado"]
        self.assertEqual(cambios[0], {"estado_anterior": "nuevo", "estado_nuevo": "en_gestion"})


# ---------------------------------------------------------------------------
# HU-24 · SCRUM-105: panel de participación (agregaciones SQL + historial Mongo)
# ---------------------------------------------------------------------------


class TestHU24Panel(unittest.TestCase):
    def setUp(self):
        self.datos = crear_datos()
        self.dir = token("direccion@ejemplo.cl")

    def test_agregaciones_sql_incluyen_actividad_sin_inscritos(self):
        r = cliente.get("/api/v1/panel/participacion", headers=self.dir)
        self.assertEqual(r.status_code, 200)
        panel = r.json()
        a1, a2 = panel["actividades"]
        self.assertEqual((a1["inscritos"], a1["cancelados"], a1["cupos_disponibles"], a1["ocupacion_pct"], a1["estado_participacion"]),
                         (2, 1, 0, 100.0, "completa"))
        self.assertEqual((a2["inscritos"], a2["ocupacion_pct"], a2["estado_participacion"]), (0, 0.0, "sin_inscritos"))
        self.assertEqual(panel["totales"], {"actividades": 2, "sin_inscritos": 1, "completas": 1, "cupo_total": 12,
                                            "inscritos": 2, "cancelados": 1, "ocupacion_pct": 16.7})

    def test_filtros_actividad_y_periodo(self):
        a1, a2 = self.datos["actividades"]
        por_actividad = cliente.get("/api/v1/panel/participacion", params={"actividad_id": a2}, headers=self.dir).json()
        self.assertEqual([a["id"] for a in por_actividad["actividades"]], [a2])
        periodo = cliente.get("/api/v1/panel/participacion", params={"desde": "2026-11-01", "hasta": "2026-11-30"}, headers=self.dir).json()
        self.assertEqual([a["id"] for a in periodo["actividades"]], [a1])
        vacio = cliente.get("/api/v1/panel/participacion", params={"desde": "2030-01-01"}, headers=self.dir).json()
        self.assertEqual((vacio["actividades"], vacio["totales"]["ocupacion_pct"]), ([], 0.0))
        self.assertEqual(cliente.get("/api/v1/panel/participacion", params={"desde": "2026-12-01", "hasta": "2026-11-01"}, headers=self.dir).status_code, 400)
        self.assertEqual(cliente.get("/api/v1/panel/participacion", params={"actividad_id": 9999}, headers=self.dir).status_code, 404)

    def test_permisos_por_rol(self):
        self.assertEqual(cliente.get("/api/v1/panel/participacion").status_code, 401)
        self.assertEqual(cliente.get("/api/v1/panel/participacion", headers=token("ap1@ejemplo.cl")).status_code, 403)
        self.assertEqual(cliente.get("/api/v1/panel/participacion", headers=token("educadora@ejemplo.cl")).status_code, 200)
        self.assertEqual(cliente.get("/api/v1/panel/participacion/historial", headers=token("ap1@ejemplo.cl")).status_code, 403)

    def test_historial_desde_mongo_filtrado_por_actividad(self):
        a1, a2 = self.datos["actividades"]
        auditoria.registrar("inscripcion_creada", recurso_tipo="actividad", recurso_id=a1, datos={"alumno_id": 1})
        auditoria.registrar("inscripcion_cancelada", recurso_tipo="actividad", recurso_id=a2, datos={"alumno_id": 2})
        r = cliente.get("/api/v1/panel/participacion/historial", params={"actividad_id": a1}, headers=self.dir)
        self.assertEqual(r.status_code, 200)
        self.assertEqual([i["tipo"] for i in r.json()["items"]], ["inscripcion_creada"])
        todos = cliente.get("/api/v1/panel/participacion/historial", headers=self.dir).json()
        self.assertEqual(todos["total"], 2)  # no incluye logins: solo eventos de inscripción
        MONGO.caida = True
        self.assertEqual(cliente.get("/api/v1/panel/participacion/historial", headers=self.dir).status_code, 503)
        # Los indicadores SQL siguen disponibles aunque MongoDB no responda.
        self.assertEqual(cliente.get("/api/v1/panel/participacion", headers=self.dir).status_code, 200)


class TestCredencialesDemo(unittest.TestCase):
    def setUp(self):
        crear_datos()

    def test_demo_password_reemplaza_solo_el_marcador_de_cuentas_ficticias(self):
        from app.core.config import settings
        from app.services.auth import asignar_credenciales_demo
        anterior = settings.demo_password
        settings.demo_password = "Demo-Entorno-1"
        try:
            with SesionPrueba() as db:
                self.assertEqual(asignar_credenciales_demo(db), 1)  # solo sinclave@ejemplo.cl
                self.assertEqual(asignar_credenciales_demo(db), 0)  # idempotente
        finally:
            settings.demo_password = anterior
        self.assertEqual(login("sinclave@ejemplo.cl", "Demo-Entorno-1").status_code, 200)
        self.assertEqual(login("ap1@ejemplo.cl", "Demo-Entorno-1").status_code, 401)  # no tocó hashes reales


# ---------------------------------------------------------------------------
# Remediación postauditoría · suplantación (X-Usuario-Id) y falsificación de rol (X-Rol)
# Ruta heredada usada como sonda: POST /categorias-actividad (HU-17, decide con X-Rol).
# ---------------------------------------------------------------------------

from app.core.config import settings  # noqa: E402

CATEGORIA = "/api/v1/categorias-actividad"


class TestRemediacionIdentidad(unittest.TestCase):
    def setUp(self):
        crear_datos()
        self.n = 0
        self.flag, self.env = settings.permitir_identidad_demo, settings.app_env

    def tearDown(self):
        settings.permitir_identidad_demo, settings.app_env = self.flag, self.env

    def crear_categoria(self, **cabeceras):
        self.n += 1
        return cliente.post(CATEGORIA, json={"nombre": f"Categoría prueba {self.n}"}, headers=cabeceras)

    def id_de(self, email):
        with SesionPrueba() as db:
            return str(db.scalar(select(Usuario.id).where(Usuario.email == email)))

    # --- Modo desarrollo (identidad demo activa): compatibilidad con pantallas heredadas ---

    def test_dev_x_rol_sin_identidad_sigue_funcionando(self):
        self.assertEqual(self.crear_categoria(**{"X-Rol": "direccion"}).status_code, 201)
        self.assertEqual(self.crear_categoria(**{"X-Rol": "apoderado"}).status_code, 403)  # regla propia de HU-17

    def test_bearer_con_x_rol_falsificado_403(self):
        r = self.crear_categoria(**{**token("ap1@ejemplo.cl"), "X-Rol": "direccion"})
        self.assertEqual(r.status_code, 403)
        self.assertIn("X-Rol no corresponde", r.json()["detail"])
        self.assertEqual(self.crear_categoria(**{**token("educadora@ejemplo.cl"), "X-Rol": "direccion"}).status_code, 403)

    def test_bearer_con_x_rol_coherente_201(self):
        self.assertEqual(self.crear_categoria(**{**token("direccion@ejemplo.cl"), "X-Rol": "DIRECCION"}).status_code, 201)

    def test_x_usuario_id_demo_con_x_rol_falsificado_403(self):
        cab = {"X-Usuario-Id": self.id_de("ap1@ejemplo.cl"), "X-Rol": "direccion"}
        self.assertEqual(self.crear_categoria(**cab).status_code, 403)
        cab = {"X-Usuario-Id": self.id_de("direccion@ejemplo.cl"), "X-Rol": "direccion"}
        self.assertEqual(self.crear_categoria(**cab).status_code, 201)

    def test_x_usuario_id_no_suplanta_cuentas_fuera_de_ejemplo_cl(self):
        real = self.id_de("direccion@jardin-ficticio.cl")
        self.assertEqual(cliente.get("/api/v1/sesion/yo", headers={"X-Usuario-Id": real}).status_code, 401)
        self.assertEqual(self.crear_categoria(**{"X-Usuario-Id": real, "X-Rol": "direccion"}).status_code, 401)
        # La misma cuenta sí entra con su contraseña (login real).
        self.assertEqual(cliente.get("/api/v1/auth/yo", headers=token("direccion@jardin-ficticio.cl")).status_code, 200)

    def test_x_usuario_id_mal_formado_401(self):
        self.assertEqual(self.crear_categoria(**{"X-Usuario-Id": "abc", "X-Rol": "direccion"}).status_code, 401)
        self.assertEqual(self.crear_categoria(**{"X-Usuario-Id": "999999", "X-Rol": "direccion"}).status_code, 401)

    def test_rutas_sin_x_rol_no_se_ven_afectadas(self):
        self.assertEqual(cliente.get("/health").status_code, 200)
        self.assertEqual(cliente.get(CATEGORIA).status_code, 200)

    # --- Modo estricto (PERMITIR_IDENTIDAD_DEMO=false) y producción ---

    def test_estricto_x_rol_sin_sesion_401_y_x_usuario_id_401(self):
        settings.permitir_identidad_demo = False
        self.assertEqual(self.crear_categoria(**{"X-Rol": "direccion"}).status_code, 401)
        cab = {"X-Usuario-Id": self.id_de("direccion@ejemplo.cl"), "X-Rol": "direccion"}
        self.assertEqual(self.crear_categoria(**cab).status_code, 401)
        self.assertEqual(cliente.get("/api/v1/sesion/yo", headers={"X-Usuario-Id": cab["X-Usuario-Id"]}).status_code, 401)
        # Con sesión real y rol coherente, la ruta heredada funciona igual.
        self.assertEqual(self.crear_categoria(**{**token("direccion@ejemplo.cl"), "X-Rol": "direccion"}).status_code, 201)

    def test_produccion_apaga_identidad_demo_aunque_el_flag_diga_true(self):
        settings.permitir_identidad_demo, settings.app_env = True, "production"
        self.assertFalse(settings.identidad_demo_activa)
        self.assertEqual(self.crear_categoria(**{"X-Rol": "direccion"}).status_code, 401)
        self.assertEqual(cliente.get("/api/v1/sesion/yo", headers={"X-Usuario-Id": self.id_de("direccion@ejemplo.cl")}).status_code, 401)

    # --- Segunda auditoría (H-04): APP_ENV con lista permitida y falla segura ---

    def test_app_env_solo_development_o_test_activan_la_identidad_demo(self):
        settings.permitir_identidad_demo = True
        for valor in ("development", " Development ", "TEST"):
            settings.app_env = valor
            self.assertTrue(settings.identidad_demo_activa, repr(valor))
        for valor in ("production", "Production", " PRODUCTION ", "prod", "staging", "", "desarrollo"):
            settings.app_env = valor
            self.assertFalse(settings.identidad_demo_activa, repr(valor))
        settings.app_env = "Production"
        self.assertEqual(self.crear_categoria(**{"X-Rol": "direccion"}).status_code, 401)

    def test_demo_password_se_ignora_fuera_de_development(self):
        from app.services.auth import asignar_credenciales_demo
        anterior = settings.demo_password
        settings.demo_password, settings.app_env = "Demo-Entorno-2", "Production"
        try:
            with SesionPrueba() as db:
                self.assertEqual(asignar_credenciales_demo(db), 0)
        finally:
            settings.demo_password = anterior
        self.assertEqual(login("sinclave@ejemplo.cl", "Demo-Entorno-2").status_code, 401)

    def test_x_rol_no_aparece_como_parametro_global_en_swagger(self):
        rutas = cliente.get("/openapi.json").json()["paths"]
        parametros = [p["name"].lower() for p in rutas["/api/v1/portal/alumnos"]["get"].get("parameters", [])]
        self.assertNotIn("x-rol", parametros)


# ---------------------------------------------------------------------------
# R4 · Matiz A: APP_ENV obligatorio, valores válidos y falla en cerrado
# ---------------------------------------------------------------------------

import subprocess  # noqa: E402
import sys  # noqa: E402
from pathlib import Path  # noqa: E402
from unittest import mock  # noqa: E402

from app.core.config import ConfiguracionInvalida, Settings, validar_configuracion  # noqa: E402


def configuracion(**valores):
    """Settings construido SOLO con los valores dados (sin variables de entorno ni .env)."""
    with mock.patch.dict(os.environ, {}, clear=True):
        return Settings(_env_file=None, **valores)


class TestR4ConfiguracionObligatoria(unittest.TestCase):
    def test_sin_app_env_no_hay_valor_por_defecto_y_se_rechaza(self):
        self.assertIsNone(configuracion().app_env)
        for valor in (None, "", "   "):
            with self.assertRaises(ConfiguracionInvalida) as error:
                validar_configuracion(configuracion(app_env=valor))
            self.assertIn("APP_ENV es obligatorio", str(error.exception))

    def test_valores_desconocidos_se_rechazan(self):
        for valor in ("prod", "dev", "desarrollo", "produccion", "local", "qa", "production1"):
            with self.assertRaises(ConfiguracionInvalida, msg=valor):
                validar_configuracion(configuracion(app_env=valor))

    def test_valores_validos_explicitos(self):
        for valor, desarrollo in (("development", True), ("test", True), (" Test ", True),
                                  ("staging", False), ("production", False), ("PRODUCTION", False)):
            config = validar_configuracion(configuracion(app_env=valor))
            self.assertEqual(config.es_entorno_de_desarrollo, desarrollo, valor)

    def test_identidad_demo_desactivada_por_defecto(self):
        config = validar_configuracion(configuracion(app_env="development"))
        self.assertFalse(config.permitir_identidad_demo)
        self.assertFalse(config.identidad_demo_activa)
        self.assertEqual(config.demo_password, "")
        self.assertTrue(validar_configuracion(configuracion(app_env="development", permitir_identidad_demo=True)).identidad_demo_activa)

    def test_staging_y_production_nunca_admiten_demo(self):
        for entorno in ("staging", "production"):
            with self.assertRaises(ConfiguracionInvalida, msg=entorno):
                validar_configuracion(configuracion(app_env=entorno, permitir_identidad_demo=True))
            with self.assertRaises(ConfiguracionInvalida, msg=entorno) as error:
                validar_configuracion(configuracion(app_env=entorno, demo_password="x-demo"))
            self.assertNotIn("x-demo", str(error.exception))  # el mensaje no muestra el secreto
            self.assertFalse(validar_configuracion(configuracion(app_env=entorno)).identidad_demo_activa)

    def test_la_aplicacion_no_inicia_sin_app_env(self):
        raiz = Path(__file__).resolve().parent
        base = {"PATH": os.environ.get("PATH", ""), "DATABASE_URL": "sqlite://"}
        for extra in ({}, {"APP_ENV": "prod"}, {"APP_ENV": "production", "PERMITIR_IDENTIDAD_DEMO": "true"}):
            r = subprocess.run([sys.executable, "-c", "import app.main"], cwd=raiz, env={**base, **extra},
                               capture_output=True, text=True, timeout=120)
            self.assertNotEqual(r.returncode, 0, extra)
            self.assertIn("ConfiguracionInvalida", r.stderr, extra)
        ok = subprocess.run([sys.executable, "-c", "import app.main"], cwd=raiz, env={**base, "APP_ENV": "production"},
                            capture_output=True, text=True, timeout=120)
        self.assertEqual(ok.returncode, 0, ok.stderr[-500:])


# ---------------------------------------------------------------------------
# R4 · Matiz B: cuentas y sesiones demo fuera de development/test
# ---------------------------------------------------------------------------


class TestR4CuentasDemoFueraDeDesarrollo(unittest.TestCase):
    def setUp(self):
        crear_datos()
        self.env = settings.app_env

    def tearDown(self):
        settings.app_env = self.env

    def conteos(self):
        with SesionPrueba() as db:
            return {
                "usuarios": db.query(Usuario).count(),
                "sesiones": db.query(Sesion).count(),
                "hash_dir_demo": db.scalar(select(Usuario.password_hash).where(Usuario.email == "direccion@ejemplo.cl")),
            }

    def test_transicion_desarrollo_a_produccion_misma_base(self):
        # En desarrollo/test: cuentas demo y cuenta legítima inician sesión.
        tok_demo_dir, tok_demo_ap = token("direccion@ejemplo.cl"), token("ap1@ejemplo.cl")
        tok_real = token("direccion@jardin-ficticio.cl")
        self.assertEqual(cliente.get("/api/v1/auth/yo", headers=tok_demo_dir).status_code, 200)
        antes = self.conteos()

        for entorno in ("production", "staging"):
            settings.app_env = entorno  # misma base, otro entorno
            # Login de cuentas demo: 401 genérico, aunque la contraseña sea correcta.
            r = login("direccion@ejemplo.cl")
            self.assertEqual(r.status_code, 401, entorno)
            self.assertEqual(r.json()["detail"], "Correo o contraseña incorrectos")
            self.assertEqual(login("ap1@ejemplo.cl").status_code, 401, entorno)
            # Tokens demo emitidos ANTES del cambio: rechazados en la validación central.
            for cab in (tok_demo_dir, tok_demo_ap):
                self.assertEqual(cliente.get("/api/v1/auth/yo", headers=cab).status_code, 401, entorno)
            self.assertEqual(cliente.get("/api/v1/portal/alumnos", headers=tok_demo_ap).status_code, 401)
            self.assertEqual(cliente.get("/api/v1/auditoria/eventos", headers=tok_demo_dir).status_code, 401)
            self.assertEqual(cliente.post("/api/v1/comunicados", json={}, headers=tok_demo_dir).status_code, 401)
            # Usuario legítimo: su token anterior y un login nuevo siguen funcionando.
            self.assertEqual(cliente.get("/api/v1/auth/yo", headers=tok_real).status_code, 200, entorno)
            self.assertEqual(cliente.get("/api/v1/auditoria/eventos", headers=tok_real).status_code, 200, entorno)
            self.assertEqual(login("direccion@jardin-ficticio.cl").status_code, 200, entorno)

        # No se borró ni modificó nada: mismos usuarios y hash; las sesiones solo aumentan por los logins legítimos.
        despues = self.conteos()
        self.assertEqual(despues["usuarios"], antes["usuarios"])
        self.assertEqual(despues["hash_dir_demo"], antes["hash_dir_demo"])
        self.assertEqual(despues["sesiones"], antes["sesiones"] + 2)

        # Al volver a desarrollo, las cuentas demo vuelven a funcionar (no se destruyó nada).
        settings.app_env = "development"
        self.assertEqual(cliente.get("/api/v1/auth/yo", headers=tok_demo_dir).status_code, 200)

    def test_login_demo_bloqueado_queda_en_bitacora_sin_datos_sensibles(self):
        settings.app_env = "production"
        login("ap1@ejemplo.cl")
        fallo = [d for d in MONGO.docs if d["tipo"] == "acceso_login" and d["resultado"] == "fallido"][-1]
        self.assertEqual(fallo["datos"], {"motivo": "cuenta_demo_fuera_de_desarrollo"})
        self.assertNotIn("ap1@ejemplo.cl", str(MONGO.docs))

    def test_demo_reconocida_sin_importar_mayusculas(self):
        from app.services.auth import es_cuenta_demo
        self.assertTrue(es_cuenta_demo(Usuario(email="Direccion.Demo@EJEMPLO.cl")))
        self.assertFalse(es_cuenta_demo(Usuario(email="direccion@jardin-ficticio.cl")))
        self.assertFalse(es_cuenta_demo(Usuario(email="ejemplo.cl@otro-dominio.cl")))


if __name__ == "__main__":
    unittest.main()

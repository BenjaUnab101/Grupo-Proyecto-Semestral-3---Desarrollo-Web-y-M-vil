import os
os.environ["DATABASE_URL"] = "sqlite://"
os.environ.setdefault("APP_ENV", "test")  # obligatorio desde R4 (Matiz A)

import unittest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.main import app
from app.db.postgres import Base, get_db

engine_test = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=engine_test, autoflush=False, autocommit=False)
Base.metadata.create_all(bind=engine_test)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

# Cierre H-01/H-02: el rol ya no se declara con X-Rol; se inicia sesión con cuentas ficticias.
from tests_sesiones import preparar_sesiones  # noqa: E402

SESION = preparar_sesiones(client, TestingSessionLocal)


def setUpModule():
    # Aislamiento: al correr varios módulos en un mismo proceso (unittest discover), cada uno
    # vuelve a instalar SU base de datos y una bitácora nula antes de sus pruebas.
    import tests_sesiones
    from app.services import auditoria

    app.dependency_overrides[get_db] = override_get_db
    auditoria.coleccion = lambda: tests_sesiones._BitacoraNula()


class TestHU27DocumentosProtocolos(unittest.TestCase):
    def test_cp_hu_27_01_crear_editar_filtrar_y_vigencia(self):
        # 1. Crear documento vigente con rol dirección
        res_crear = client.post(
            "/api/v1/documentos",
            json={
                "titulo": "Reglamento Interno de Convivencia 2026",
                "categoria": "Reglamentos",
                "descripcion": "Normativa oficial de convivencia escolar y deberes.",
                "url_archivo": "/docs/reglamento-2026.pdf",
                "vigente": True,
            },
            headers=SESION["direccion"],
        )
        self.assertEqual(res_crear.status_code, 201)
        doc_id = res_crear.json()["id"]

        # 2. Consultar documentos vigentes por categoría
        res_lista = client.get("/api/v1/documentos?solo_vigentes=true&categoria=Reglamentos")
        self.assertEqual(res_lista.status_code, 200)
        self.assertTrue(any(d["id"] == doc_id for d in res_lista.json()))

        # 3. Editar documento y pasar a no vigente (archivar)
        res_edit = client.patch(
            f"/api/v1/documentos/{doc_id}",
            json={"vigente": False, "descripcion": "Versión archivada"},
            headers=SESION["direccion"],
        )
        self.assertEqual(res_edit.status_code, 200)
        self.assertFalse(res_edit.json()["vigente"])

        # 4. Verificar que ya no aparece en listado público de vigentes
        res_vigentes = client.get("/api/v1/documentos?solo_vigentes=true")
        self.assertFalse(any(d["id"] == doc_id for d in res_vigentes.json()))

    def test_cp_hu_27_02_rechazo_sin_permisos_duplicados_y_categoria_invalida(self):
        # 1. Rechazo 403 si apoderado intenta publicar un protocolo
        res_403 = client.post(
            "/api/v1/documentos",
            json={
                "titulo": "Protocolo Intruso",
                "categoria": "Protocolos",
                "descripcion": "Intento sin rol dirección.",
            },
            headers=SESION["apoderado"],
        )
        self.assertEqual(res_403.status_code, 403)

        # 2. Rechazo 400 si la categoría no es válida o faltan datos
        res_400 = client.post(
            "/api/v1/documentos",
            json={
                "titulo": "AB",
                "categoria": "CategoriaInventada",
                "descripcion": "123",
            },
            headers=SESION["direccion"],
        )
        self.assertEqual(res_400.status_code, 400)

        # 3. Rechazo 409 por título duplicado
        client.post(
            "/api/v1/documentos",
            json={
                "titulo": "Plan Integral de Seguridad Escolar (PISE)",
                "categoria": "Protocolos",
                "descripcion": "Zonas seguras y evacuación.",
            },
            headers=SESION["direccion"],
        )
        res_409 = client.post(
            "/api/v1/documentos",
            json={
                "titulo": "Plan Integral de Seguridad Escolar (PISE)",
                "categoria": "Protocolos",
                "descripcion": "Duplicado.",
            },
            headers=SESION["direccion"],
        )
        self.assertEqual(res_409.status_code, 409)


    def test_cierre_h01_x_rol_ya_no_otorga_permisos(self):
        # Sin sesión, aunque el navegador diga X-Rol: direccion -> 401 (H-01/H-03).
        r = client.post("/api/v1/documentos", json={}, headers={"X-Rol": "direccion"})
        self.assertEqual(r.status_code, 401)
        # Con sesión de apoderado y X-Rol falsificado -> 403.
        r = client.post("/api/v1/documentos", json={}, headers={**SESION["apoderado"], "X-Rol": "direccion"})
        self.assertEqual(r.status_code, 403)

if __name__ == "__main__":
    unittest.main(verbosity=2)

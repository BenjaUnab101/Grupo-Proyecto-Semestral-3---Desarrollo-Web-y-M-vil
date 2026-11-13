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


class TestHU18ActividadesEscolares(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        res_cat = client.post(
            "/api/v1/categorias-actividad",
            json={"nombre": "Salidas Pedagógicas", "descripcion": "Visitas guiadas"},
            headers=SESION["direccion"],
        )
        cls.cat_id = res_cat.json()["id"]

        res_org = client.post(
            "/api/v1/organizadores",
            json={
                "nombre": "Paula Reyes",
                "email": "paula.reyes@pequenosreyes.cl",
                "rol_perfil": "Educadora",
            },
            headers=SESION["direccion"],
        )
        cls.org_id = res_org.json()["id"]

    def test_cp_hu_18_01_ciclo_crear_editar_publicar_cancelar_y_visibilidad(self):
        # 1. Crear actividad en estado 'borrador' (CA1 / CA2)
        res_crear = client.post(
            "/api/v1/actividades",
            json={
                "titulo": "Visita Granja Educativa",
                "fecha": "2026-11-20",
                "hora": "09:30",
                "lugar": "Patio Central",
                "preparar": "Gorro y bloqueador solar",
                "capacidad": 15,
                "categoria_id": self.cat_id,
                "organizador_id": self.org_id,
                "estado": "borrador",
            },
            headers=SESION["organizador"],
        )
        self.assertEqual(res_crear.status_code, 201)
        act_id = res_crear.json()["id"]
        self.assertEqual(res_crear.json()["estado"], "borrador")

        # 2. CA3: En borrador NO debe ser visible para familias (solo_publicadas=true)
        visibles_familias = client.get("/api/v1/actividades?solo_publicadas=true").json()
        self.assertFalse(any(a["id"] == act_id for a in visibles_familias))

        # 3. CA1 / CA4: Editar lugar y capacidad
        res_editar = client.patch(
            f"/api/v1/actividades/{act_id}",
            json={"lugar": "Granja Educativa Quilpué", "capacidad": 20},
            headers=SESION["organizador"],
        )
        self.assertEqual(res_editar.status_code, 200)
        self.assertEqual(res_editar.json()["lugar"], "Granja Educativa Quilpué")
        self.assertEqual(res_editar.json()["cupos_disponibles"], 20)

        # 4. CA1 / CA3: Publicar actividad y verificar que ahora SÍ es visible a familias
        res_pub = client.post(
            f"/api/v1/actividades/{act_id}/publicar",
            headers=SESION["organizador"],
        )
        self.assertEqual(res_pub.status_code, 200)
        self.assertEqual(res_pub.json()["estado"], "publicada")

        visibles_tras_pub = client.get("/api/v1/actividades?solo_publicadas=true").json()
        self.assertTrue(any(a["id"] == act_id for a in visibles_tras_pub))

        # 5. CA1 / CA3: Cancelar actividad y verificar que deja de mostrarse a familias
        res_canc = client.post(
            f"/api/v1/actividades/{act_id}/cancelar",
            headers=SESION["organizador"],
        )
        self.assertEqual(res_canc.status_code, 200)
        self.assertEqual(res_canc.json()["estado"], "cancelada")

        visibles_tras_canc = client.get("/api/v1/actividades?solo_publicadas=true").json()
        self.assertFalse(any(a["id"] == act_id for a in visibles_tras_canc))

    def test_cp_hu_18_02_validaciones_entrada_y_rechazo_dominio(self):
        # 1. Rechazo por rol no autorizado (apoderado intentando crear -> 403)
        res_403 = client.post(
            "/api/v1/actividades",
            json={
                "titulo": "Evento no autorizado",
                "fecha": "2026-11-25",
                "lugar": "Sala 1",
                "capacidad": 10,
                "categoria_id": self.cat_id,
                "organizador_id": self.org_id,
            },
            headers=SESION["apoderado"],
        )
        self.assertEqual(res_403.status_code, 403)

        # 2. Rechazo por cupos inválidos o hora mal formada (400)
        res_400 = client.post(
            "/api/v1/actividades",
            json={
                "titulo": "Evento inválido",
                "fecha": "2026-11-25",
                "hora": "hora-mala",
                "lugar": "Sala 1",
                "capacidad": 0,
                "categoria_id": self.cat_id,
                "organizador_id": self.org_id,
            },
            headers=SESION["organizador"],
        )
        self.assertEqual(res_400.status_code, 400)

        # 3. Rechazo por categoría u organizador inexistente (404)
        res_404 = client.post(
            "/api/v1/actividades",
            json={
                "titulo": "Evento sin FK",
                "fecha": "2026-11-25",
                "lugar": "Sala 1",
                "capacidad": 15,
                "categoria_id": 9999,
                "organizador_id": self.org_id,
            },
            headers=SESION["organizador"],
        )
        self.assertEqual(res_404.status_code, 404)


if __name__ == "__main__":
    unittest.main(verbosity=2)

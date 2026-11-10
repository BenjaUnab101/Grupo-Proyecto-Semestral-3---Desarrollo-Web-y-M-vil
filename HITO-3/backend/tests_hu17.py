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


class TestHU17OrganizadoresCategorias(unittest.TestCase):
    def test_cp_hu_17_01_flujo_exitoso_crear_editar_listar(self):
        # 1. Crear categoría con rol dirección
        res_cat = client.post(
            "/api/v1/categorias-actividad",
            json={"nombre": "Taller Fonoaudiológico", "descripcion": "Sesiones grupales TEL"},
            headers=SESION["direccion"],
        )
        self.assertEqual(res_cat.status_code, 201)
        cat_id = res_cat.json()["id"]

        # 2. Editar categoría
        res_edit_cat = client.patch(
            f"/api/v1/categorias-actividad/{cat_id}",
            json={"descripcion": "Sesiones actualizadas"},
            headers=SESION["direccion"],
        )
        self.assertEqual(res_edit_cat.status_code, 200)
        self.assertEqual(res_edit_cat.json()["descripcion"], "Sesiones actualizadas")

        # 3. Crear organizador con rol dirección
        res_org = client.post(
            "/api/v1/organizadores",
            json={
                "nombre": "Camila Soto",
                "email": "camila.soto@pequenosreyes.cl",
                "rol_perfil": "Educadora",
                "telefono": "+56 9 1234 5678",
            },
            headers=SESION["direccion"],
        )
        self.assertEqual(res_org.status_code, 201)
        org_id = res_org.json()["id"]

        # 4. Editar organizador
        res_edit_org = client.patch(
            f"/api/v1/organizadores/{org_id}",
            json={"rol_perfil": "Coordinación"},
            headers=SESION["direccion"],
        )
        self.assertEqual(res_edit_org.status_code, 200)
        self.assertEqual(res_edit_org.json()["rol_perfil"], "Coordinación")

        # 5. Listar organizadores y categorías
        lista_org = client.get("/api/v1/organizadores")
        lista_cat = client.get("/api/v1/categorias-actividad")
        self.assertEqual(lista_org.status_code, 200)
        self.assertEqual(lista_cat.status_code, 200)
        self.assertGreaterEqual(len(lista_org.json()), 1)
        self.assertGreaterEqual(len(lista_cat.json()), 1)

    def test_cp_hu_17_02_rechazo_permisos_duplicados_y_validacion(self):
        # 1. Rechazo por falta de permisos de dirección (403)
        res_sin_permiso = client.post(
            "/api/v1/organizadores",
            json={
                "nombre": "Intruso Demo",
                "email": "intruso@pequenosreyes.cl",
                "rol_perfil": "Educadora",
            },
            headers=SESION["apoderado"],
        )
        self.assertEqual(res_sin_permiso.status_code, 403)

        # 2. Rechazo por entrada inválida: email mal formado o rol inexistente (400)
        res_invalido = client.post(
            "/api/v1/organizadores",
            json={
                "nombre": "A",
                "email": "correo-invalido",
                "rol_perfil": "RolInventado",
            },
            headers=SESION["direccion"],
        )
        self.assertEqual(res_invalido.status_code, 400)

        # 3. Rechazo por duplicado de categoría (409)
        client.post(
            "/api/v1/categorias-actividad",
            json={"nombre": "Reunión Apoderados"},
            headers=SESION["direccion"],
        )
        res_duplicado = client.post(
            "/api/v1/categorias-actividad",
            json={"nombre": "Reunión Apoderados"},
            headers=SESION["direccion"],
        )
        self.assertEqual(res_duplicado.status_code, 409)


    def test_cierre_h01_x_rol_ya_no_otorga_permisos(self):
        # Sin sesión, aunque el navegador diga X-Rol: direccion -> 401 (H-01/H-03).
        r = client.post("/api/v1/organizadores", json={}, headers={"X-Rol": "direccion"})
        self.assertEqual(r.status_code, 401)
        # Con sesión de apoderado y X-Rol falsificado -> 403.
        r = client.post("/api/v1/organizadores", json={}, headers={**SESION["apoderado"], "X-Rol": "direccion"})
        self.assertEqual(r.status_code, 403)

if __name__ == "__main__":
    unittest.main(verbosity=2)

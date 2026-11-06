import os
os.environ["DATABASE_URL"] = "sqlite://"

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


class TestHU20PagosYComprobantes(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        res_cat = client.post(
            "/api/v1/categorias-actividad",
            json={"nombre": "Talleres Recreativos"},
            headers={"X-Rol": "direccion"},
        )
        cls.cat_id = res_cat.json()["id"]

        res_org = client.post(
            "/api/v1/organizadores",
            json={
                "nombre": "Benjamín Concha",
                "email": "benjamin.concha@pequenosreyes.cl",
                "rol_perfil": "Coordinación",
            },
            headers={"X-Rol": "direccion"},
        )
        cls.org_id = res_org.json()["id"]

        res_act = client.post(
            "/api/v1/actividades",
            json={
                "titulo": "Jornada de Títeres y Lenguaje",
                "fecha": "2026-11-28",
                "hora": "11:00",
                "lugar": "Salón Multiuso",
                "capacidad": 1,
                "categoria_id": cls.cat_id,
                "organizador_id": cls.org_id,
                "estado": "publicada",
            },
            headers={"X-Rol": "organizador"},
        )
        cls.act_id = res_act.json()["id"]

    def test_cp_hu_20_01_flujo_pago_simulado_comprobante_y_transiciones(self):
        # 1. Registrar inscripción con pago simulado en estado 'pendiente' (CA1, CA4)
        res_pago = client.post(
            "/api/v1/pagos",
            json={
                "actividad_id": self.act_id,
                "apoderado_rut": "12.345.678-5",
                "nombre_parvulo": "Sofía Pérez Soto",
                "monto": 3500,
                "metodo_pago": "Transferencia Simulada",
                "estado_pago": "pendiente",
            },
        )
        self.assertEqual(res_pago.status_code, 201)
        datos = res_pago.json()
        pago_id = datos["id"]
        codigo = datos["codigo_comprobante"]
        self.assertTrue(codigo.startswith("PR-COMP-"))
        self.assertTrue(datos["es_simulado"])

        # 2. CA3: Transición autorizada pendiente -> pagado -> confirmado
        res_pagado = client.patch(
            f"/api/v1/pagos/{pago_id}/estado",
            json={"estado_pago": "pagado"},
        )
        self.assertEqual(res_pagado.status_code, 200)
        self.assertEqual(res_pagado.json()["estado_pago"], "pagado")

        res_conf = client.patch(
            f"/api/v1/pagos/{pago_id}/estado",
            json={"estado_pago": "confirmado"},
        )
        self.assertEqual(res_conf.status_code, 200)
        self.assertEqual(res_conf.json()["estado_pago"], "confirmado")

        # 3. CA2 y CA5: Consultar comprobante por código único verificable
        res_comp = client.get(f"/api/v1/pagos/comprobante/{codigo}")
        self.assertEqual(res_comp.status_code, 200)
        self.assertEqual(res_comp.json()["nombre_parvulo"], "Sofía Pérez Soto")
        self.assertEqual(res_comp.json()["estado_pago"], "confirmado")

    def test_cp_hu_20_02_rechazo_sin_cupos_transicion_invalida_y_validacion(self):
        # 1. Rechazo 409 cuando la actividad ya no tiene cupos disponibles
        res_sin_cupo = client.post(
            "/api/v1/pagos",
            json={
                "actividad_id": self.act_id,
                "apoderado_rut": "9.876.543-3",
                "nombre_parvulo": "Martín Muñoz Díaz",
                "monto": 3500,
            },
        )
        self.assertEqual(res_sin_cupo.status_code, 409)

        # 2. Rechazo 409 por transición de estado NO autorizada (confirmado -> pendiente)
        lista = client.get(f"/api/v1/pagos?actividad_id={self.act_id}").json()
        pago_id = lista[0]["id"]
        res_trans_invalida = client.patch(
            f"/api/v1/pagos/{pago_id}/estado",
            json={"estado_pago": "pendiente"},
        )
        self.assertEqual(res_trans_invalida.status_code, 409)

        # 3. Rechazo 400 por monto negativo o entrada inválida
        res_400 = client.post(
            "/api/v1/pagos",
            json={
                "actividad_id": self.act_id,
                "apoderado_rut": "12",
                "nombre_parvulo": "A",
                "monto": -500,
            },
        )
        self.assertEqual(res_400.status_code, 400)


if __name__ == "__main__":
    unittest.main(verbosity=2)

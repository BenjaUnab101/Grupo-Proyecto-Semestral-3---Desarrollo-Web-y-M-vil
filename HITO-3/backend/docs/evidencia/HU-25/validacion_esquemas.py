"""HU-25 · Reglas de validación de la API (sin base de datos ni servidor).

Uso (desde HITO-3/backend):  docker compose exec api python docs/evidencia/HU-25/validacion_esquemas.py
Comprueba que la API acepta y rechaza lo mismo que el formulario de React. Datos ficticios.
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3]))
from pydantic import ValidationError  # noqa: E402

from app.schemas.prematricula import SolicitudIn  # noqa: E402

BASE = {"nombre_apoderado": " Familia Demo ", "rut": "12.345.678-5", "correo": "Familia.Demo@Ejemplo.CL",
        "telefono": "+56 9 1234 5678", "nombre_parvulo": "Párvulo Demo", "nivel": "medio-mayor", "consentimiento": True}
CASOS = [  # (descripción, cambio, campo que debe fallar o None si se acepta)
    ("datos válidos", {}, None),
    ("RUT con K", {"rut": "10.000.013-K"}, None),
    ("teléfono fijo 32 212 3456", {"telefono": "32 212 3456"}, None),
    ("RUT con dígito verificador incorrecto", {"rut": "12.345.678-9"}, "rut"),
    ("correo sin extensión", {"correo": "demo@ejemplo"}, "correo"),
    ("teléfono de 8 dígitos", {"telefono": "12345678"}, "telefono"),
    ("nivel inexistente", {"nivel": "kinder-z"}, "nivel"),
    ("sin consentimiento", {"consentimiento": False}, "consentimiento"),
    ("nombre del párvulo solo espacios", {"nombre_parvulo": "   "}, "nombre_parvulo"),
    ("comentario de 301 caracteres", {"comentario": "x" * 301}, "comentario"),
]
ok = 0
for descripcion, cambio, campo in CASOS:
    try:
        datos = SolicitudIn(**(BASE | cambio))
        paso, detalle = campo is None, f"aceptado: rut={datos.rut} correo={datos.correo} telefono={datos.telefono}"
    except ValidationError as error:
        campos = {e["loc"][0]: e["msg"] for e in error.errors()}
        paso, detalle = campo in campos, f"rechazado: {campos}"
    ok += paso
    print(f"[{'PASS' if paso else 'FAIL'}] {descripcion} -> {detalle}")
print(f"\nResultado: {ok}/{len(CASOS)} PASS")
sys.exit(0 if ok == len(CASOS) else 1)

# Prueba de la propuesta (aplicada SOLO en una copia dentro de un contenedor desechable).
import tests_s3_daniel as t
t.crear_datos()
c = t.cliente
url = "/api/v1/categorias-actividad"
r1 = c.post(url, json={"nombre": "Propuesta uno"}, headers={"X-Rol": "direccion"})
r2 = c.post(url, json={"nombre": "Propuesta dos"}, headers=t.token("ap1@ejemplo.cl"))
r3 = c.post(url, json={"nombre": "Propuesta tres"}, headers=t.token("direccion@ejemplo.cl"))
r4 = c.post("/api/v1/actividades", json={}, headers=t.token("educadora@ejemplo.cl"))
print("X-Rol sin sesión ->", r1.status_code, "(esperado 401)")
print("Bearer apoderado ->", r2.status_code, "(esperado 403)")
print("Bearer dirección ->", r3.status_code, "(esperado 201)")
print("Bearer educadora en /actividades (pasa el permiso, falla validación) ->", r4.status_code, "(esperado 400)")
ok = (r1.status_code, r2.status_code, r3.status_code, r4.status_code) == (401, 403, 201, 400)
print("PROPUESTA:", "PASS" if ok else "FAIL")

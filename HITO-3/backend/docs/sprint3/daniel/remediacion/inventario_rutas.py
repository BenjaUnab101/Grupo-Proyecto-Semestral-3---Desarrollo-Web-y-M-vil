import os; os.environ["DATABASE_URL"]="sqlite://"
from fastapi.routing import APIRoute
from app.main import app
import app.core.permisos as p
FUN={p.usuario_autenticado:"Bearer", p.usuario_autenticado_opcional:"Bearer-opc", p.usuario_opcional:"Bearer|X-Usuario-Id(opc)",
     p.editor_requerido:"Bearer|X-Usuario-Id + rol", p.direccion_requerida:"Bearer|X-Usuario-Id + dirección"}
def deps(d, acc):
    for s in d.dependencies:
        if s.call is p.validar_cabecera_rol: continue
        if s.call in FUN: acc.add(FUN[s.call])
        if getattr(s.call,"__name__","")=="verificar": acc.add("Bearer + rol")
        deps(s, acc)
    for h in d.header_params:
        if h.name=="x_rol": acc.add("X-Rol (cliente)")
    return acc
filas=[]
for r in app.routes:
    if not isinstance(r, APIRoute): continue
    for m in sorted(r.methods):
        acc=deps(r.dependant,set())
        mod=r.endpoint.__module__.split(".")[-1]
        filas.append((mod, m, r.path, ", ".join(sorted(acc)) or "NINGUNA"))
for f in sorted(filas): print(" | ".join(f))

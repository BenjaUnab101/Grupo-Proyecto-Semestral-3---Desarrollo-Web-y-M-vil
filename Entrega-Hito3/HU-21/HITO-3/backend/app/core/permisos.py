from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.db.models import Usuario
from app.db.postgres import get_db

# Identidad SIMULADA (todavía no hay login): quien llama envía el encabezado X-Usuario-Id
# con su id de la tabla usuarios. Cuando exista login real, solo cambia usuario_opcional().


def usuario_opcional(x_usuario_id: int | None = Header(default=None, gt=0), db: Session = Depends(get_db)):
    if x_usuario_id is None:
        return None
    usuario = db.get(Usuario, x_usuario_id)
    if not usuario or not usuario.activo:
        raise HTTPException(401, "Usuario no reconocido o inactivo")
    return usuario


def es_editor(usuario) -> bool:
    return usuario is not None and usuario.rol in ("administrador", "organizador")


def puede_modificar(usuario, autor_usuario_id: int) -> bool:
    # Dirección modifica cualquier comunicado; el personal, solo los suyos.
    return usuario.rol == "administrador" or usuario.id == autor_usuario_id


# HU-21: publicar y editar comunicados (dirección o personal del jardín).
def editor_requerido(usuario=Depends(usuario_opcional)):
    if usuario is None:
        raise HTTPException(401, "Debe identificarse con el encabezado X-Usuario-Id")
    if not es_editor(usuario):
        raise HTTPException(403, "Solo dirección y el personal del jardín pueden publicar comunicados")
    return usuario

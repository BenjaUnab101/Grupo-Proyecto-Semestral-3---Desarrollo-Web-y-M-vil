from datetime import date, datetime, time
from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, ForeignKey, Integer, String, Text, Time, UniqueConstraint, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.postgres import Base


class Apoderado(Base):
    __tablename__ = "apoderados"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(180), nullable=False, unique=True, index=True)
    rut_hash: Mapped[str | None] = mapped_column(String(255), nullable=True, unique=True)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    relaciones: Mapped[list["ApoderadoAlumno"]] = relationship(back_populates="apoderado", cascade="all, delete-orphan")


class Sala(Base):
    __tablename__ = "salas"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(80), nullable=False, unique=True)
    nivel: Mapped[str] = mapped_column(String(40), nullable=False)
    capacidad: Mapped[int] = mapped_column(Integer, nullable=False, default=15)
    activa: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # HU-21: grupo de comunicados de la sala ('Preescolar' o 'Salas TEL'). Migración V004.
    grupo_comunicados: Mapped[str] = mapped_column(String(20), nullable=False, default="Preescolar", server_default="Preescolar")
    __table_args__ = (
        CheckConstraint("capacidad > 0", name="ck_salas_capacidad_positiva"),
        CheckConstraint("grupo_comunicados IN ('Preescolar','Salas TEL')", name="ck_salas_grupo_comunicados"),
    )


class Alumno(Base):
    __tablename__ = "alumnos"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    codigo: Mapped[str] = mapped_column(String(20), nullable=False, unique=True, index=True)
    nombre: Mapped[str] = mapped_column(String(120), nullable=False)
    fecha_nacimiento: Mapped[date | None] = mapped_column(Date, nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    relaciones: Mapped[list["ApoderadoAlumno"]] = relationship(back_populates="alumno", cascade="all, delete-orphan")
    matriculas: Mapped[list["Matricula"]] = relationship(back_populates="alumno")


class ApoderadoAlumno(Base):
    __tablename__ = "apoderados_alumnos"
    apoderado_id: Mapped[int] = mapped_column(ForeignKey("apoderados.id", ondelete="CASCADE"), primary_key=True)
    alumno_id: Mapped[int] = mapped_column(ForeignKey("alumnos.id", ondelete="CASCADE"), primary_key=True)
    parentesco: Mapped[str] = mapped_column(String(40), nullable=False, default="Apoderado")
    es_contacto_principal: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    apoderado: Mapped["Apoderado"] = relationship(back_populates="relaciones")
    alumno: Mapped["Alumno"] = relationship(back_populates="relaciones")


class Matricula(Base):
    __tablename__ = "matriculas"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    alumno_id: Mapped[int] = mapped_column(ForeignKey("alumnos.id", ondelete="RESTRICT"), nullable=False)
    sala_id: Mapped[int] = mapped_column(ForeignKey("salas.id", ondelete="RESTRICT"), nullable=False)
    anio_escolar: Mapped[int] = mapped_column(Integer, nullable=False)
    fecha: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="pendiente")
    alumno: Mapped["Alumno"] = relationship(back_populates="matriculas")
    sala: Mapped["Sala"] = relationship()
    __table_args__ = (
        UniqueConstraint("alumno_id", "anio_escolar", name="uq_matricula_alumno_anio"),
        CheckConstraint("estado IN ('pendiente','vigente','anulada')", name="ck_matricula_estado"),
        CheckConstraint("anio_escolar >= 2020", name="ck_matricula_anio"),
    )


# ---------- HU-17/18/20/27: categorías de actividad, organizadores, actividades escolares,
# pagos de inscripción y documentos (tablas creadas en V001) ----------


class CategoriaActividad(Base):
    __tablename__ = "categorias_actividad"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(80), nullable=False, unique=True, index=True)
    descripcion: Mapped[str | None] = mapped_column(String(255), nullable=True)
    activa: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class Organizador(Base):
    __tablename__ = "organizadores"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(180), nullable=False, unique=True, index=True)
    rol_perfil: Mapped[str] = mapped_column(String(60), nullable=False)
    telefono: Mapped[str | None] = mapped_column(String(30), nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    __table_args__ = (
        CheckConstraint(
            "rol_perfil IN ('Dirección','Educadora','Fonoaudióloga','Coordinación')",
            name="ck_organizador_rol_perfil",
        ),
    )


class ActividadEscolar(Base):
    __tablename__ = "actividades_escolares"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    titulo: Mapped[str] = mapped_column(String(140), nullable=False)
    fecha: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    hora: Mapped[str | None] = mapped_column(String(5), nullable=True)
    lugar: Mapped[str] = mapped_column(String(120), nullable=False)
    preparar: Mapped[str | None] = mapped_column(String(255), nullable=True)
    capacidad: Mapped[int] = mapped_column(Integer, nullable=False, default=15)
    cupos_ocupados: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="borrador")
    categoria_id: Mapped[int] = mapped_column(
        ForeignKey("categorias_actividad.id", ondelete="RESTRICT"), nullable=False
    )
    organizador_id: Mapped[int] = mapped_column(
        ForeignKey("organizadores.id", ondelete="RESTRICT"), nullable=False
    )
    categoria: Mapped["CategoriaActividad"] = relationship()
    organizador: Mapped["Organizador"] = relationship()
    __table_args__ = (
        CheckConstraint("capacidad > 0", name="ck_actividad_capacidad_positiva"),
        CheckConstraint(
            "cupos_ocupados >= 0 AND cupos_ocupados <= capacidad",
            name="ck_actividad_cupos_rango",
        ),
        CheckConstraint(
            "estado IN ('borrador','publicada','cancelada')",
            name="ck_actividad_estado",
        ),
    )


class InscripcionPago(Base):
    __tablename__ = "inscripciones_pagos"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    codigo_comprobante: Mapped[str] = mapped_column(String(60), nullable=False, unique=True, index=True)
    actividad_id: Mapped[int] = mapped_column(
        ForeignKey("actividades_escolares.id", ondelete="RESTRICT"), nullable=False
    )
    apoderado_rut: Mapped[str] = mapped_column(String(20), nullable=False)
    nombre_parvulo: Mapped[str] = mapped_column(String(120), nullable=False)
    monto: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    metodo_pago: Mapped[str] = mapped_column(String(40), nullable=False, default="Transferencia Simulada")
    estado_pago: Mapped[str] = mapped_column(String(20), nullable=False, default="pendiente")
    fecha_transaccion: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=func.now())
    actividad: Mapped["ActividadEscolar"] = relationship()
    __table_args__ = (
        CheckConstraint("monto >= 0", name="ck_pago_monto_positivo"),
        CheckConstraint(
            "estado_pago IN ('pendiente','pagado','confirmado','cancelado')",
            name="ck_pago_estado",
        ),
    )


class DocumentoInstitucional(Base):
    __tablename__ = "documentos_institucionales"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    titulo: Mapped[str] = mapped_column(String(140), nullable=False, unique=True, index=True)
    categoria: Mapped[str] = mapped_column(String(40), nullable=False)
    descripcion: Mapped[str] = mapped_column(String(500), nullable=False)
    url_archivo: Mapped[str | None] = mapped_column(String(255), nullable=True)
    vigente: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    fecha_actualizacion: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    __table_args__ = (
        CheckConstraint(
            "categoria IN ('Reglamentos','Protocolos','Formularios')",
            name="ck_documento_categoria",
        ),
    )


# ---------- HU-19: actividades con inscripción y cupos, y sus inscripciones ----------
# El esquema REAL lo crean las migraciones de sql/migraciones; estos modelos solo lo
# describen para SQLAlchemy y deben mantenerse iguales a ellas.


class Actividad(Base):
    __tablename__ = "actividades"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    codigo: Mapped[str] = mapped_column(String(30), nullable=False, unique=True)
    titulo: Mapped[str] = mapped_column(String(160), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    fecha: Mapped[date] = mapped_column(Date, nullable=False)
    hora: Mapped[time | None] = mapped_column(Time, nullable=True)
    lugar: Mapped[str | None] = mapped_column(String(120), nullable=True)
    cupo_maximo: Mapped[int] = mapped_column(Integer, nullable=False)
    inscripciones_abiertas: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=text("true"))
    # TEC-16: categoría, organizador y costo (CLP, 0 = gratuita).
    categoria_id: Mapped[int | None] = mapped_column(ForeignKey("categorias.id", ondelete="RESTRICT"), nullable=True)
    organizador_id: Mapped[int | None] = mapped_column(ForeignKey("organizadores.id", ondelete="RESTRICT"), nullable=True)
    costo: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default=text("0"))
    inscripciones: Mapped[list["Inscripcion"]] = relationship(back_populates="actividad")


class Inscripcion(Base):
    __tablename__ = "inscripciones"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    actividad_id: Mapped[int] = mapped_column(ForeignKey("actividades.id", ondelete="RESTRICT"), nullable=False)
    alumno_id: Mapped[int] = mapped_column(ForeignKey("alumnos.id", ondelete="RESTRICT"), nullable=False)
    apoderado_id: Mapped[int] = mapped_column(ForeignKey("apoderados.id", ondelete="RESTRICT"), nullable=False)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="inscrita", server_default="inscrita")
    creada_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    actualizada_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    cancelada_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    actividad: Mapped["Actividad"] = relationship(back_populates="inscripciones")
    alumno: Mapped["Alumno"] = relationship()


# ---------- TEC-16: usuarios, categorías, pagos e institución ----------
# Esquema creado por sql/migraciones/V003__usuarios_eventos_pagos_institucion.sql.


class Institucion(Base):
    __tablename__ = "institucion"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    nombre: Mapped[str] = mapped_column(String(120), nullable=False)
    tipo: Mapped[str] = mapped_column(String(120), nullable=False)
    direccion: Mapped[str] = mapped_column(String(200), nullable=False)
    comuna: Mapped[str] = mapped_column(String(80), nullable=False)
    region: Mapped[str] = mapped_column(String(80), nullable=False)
    telefono: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(180), nullable=True)
    horario_atencion: Mapped[str | None] = mapped_column(String(120), nullable=True)
    actualizado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class Usuario(Base):
    __tablename__ = "usuarios"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(180), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    rol: Mapped[str] = mapped_column(String(20), nullable=False)
    apoderado_id: Mapped[int | None] = mapped_column(ForeignKey("apoderados.id", ondelete="RESTRICT"), nullable=True, unique=True)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=text("true"))
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class Categoria(Base):
    __tablename__ = "categorias"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(60), nullable=False, unique=True)
    descripcion: Mapped[str | None] = mapped_column(String(200), nullable=True)


class Pago(Base):
    # Pagos FICTICIOS: no hay datos de tarjeta ni de cuenta; el método es siempre 'simulado'.
    __tablename__ = "pagos"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    inscripcion_id: Mapped[int] = mapped_column(ForeignKey("inscripciones.id", ondelete="RESTRICT"), nullable=False)
    monto: Mapped[int] = mapped_column(Integer, nullable=False)
    moneda: Mapped[str] = mapped_column(String(3), nullable=False, default="CLP", server_default="CLP")
    metodo: Mapped[str] = mapped_column(String(20), nullable=False, default="simulado", server_default="simulado")
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="aprobado", server_default="aprobado")
    referencia: Mapped[str] = mapped_column(String(40), nullable=False, unique=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    actualizado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


# ---------- HU-21: comunicados (antes en MongoDB) ----------
# Esquema creado por sql/migraciones/V004__comunicados.sql.


class Comunicado(Base):
    __tablename__ = "comunicados"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    titulo: Mapped[str] = mapped_column(String(160), nullable=False)
    cuerpo: Mapped[str] = mapped_column(Text, nullable=False)
    nivel: Mapped[str] = mapped_column(String(20), nullable=False)
    alcance: Mapped[str | None] = mapped_column(String(100), nullable=True)
    categoria: Mapped[str] = mapped_column(String(50), nullable=False, default="Aviso", server_default="Aviso")
    es_urgente: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=text("false"))
    publicado: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=text("true"))
    fecha_publicacion: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    vigente_hasta: Mapped[date | None] = mapped_column(Date, nullable=True)
    autor_usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    actualizado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


# ---------- HU-25: solicitudes de pre-matrícula (migración V005) ----------


class SolicitudPrematricula(Base):
    __tablename__ = "solicitudes_prematricula"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    codigo: Mapped[str] = mapped_column(String(9), nullable=False, unique=True)
    nombre_apoderado: Mapped[str] = mapped_column(String(80), nullable=False)
    rut: Mapped[str] = mapped_column(String(10), nullable=False)
    correo: Mapped[str] = mapped_column(String(254), nullable=False)
    telefono: Mapped[str] = mapped_column(String(9), nullable=False)
    nombre_parvulo: Mapped[str] = mapped_column(String(80), nullable=False)
    nivel: Mapped[str] = mapped_column(String(20), nullable=False)
    comentario: Mapped[str | None] = mapped_column(String(300), nullable=True)
    consentimiento_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    estado: Mapped[str] = mapped_column(String(20), nullable=False, server_default="recibida")
    mensaje_familia: Mapped[str | None] = mapped_column(String(300), nullable=True)
    creada_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    actualizada_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

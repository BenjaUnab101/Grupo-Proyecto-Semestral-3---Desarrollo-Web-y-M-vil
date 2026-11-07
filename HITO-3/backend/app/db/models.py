from datetime import date, datetime, time
from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, ForeignKey, Index, Integer, String, Text, Time, UniqueConstraint, func, text
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
    __table_args__ = (CheckConstraint("capacidad > 0", name="ck_salas_capacidad_positiva"),)


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


# HU-19: actividades (los "eventos" del modelo) y sus inscripciones.
# El esquema REAL lo crean las migraciones de sql/migraciones (V002 y V003); estos
# modelos solo lo describen para SQLAlchemy y deben mantenerse iguales a ellas.
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
    __table_args__ = (
        CheckConstraint("cupo_maximo > 0", name="ck_actividades_cupo_positivo"),
        CheckConstraint("costo >= 0", name="ck_actividades_costo_no_negativo"),
    )


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
    __table_args__ = (
        # CA3: un alumno tiene como máximo una inscripción por actividad. Si cancela y
        # vuelve a inscribirse, se reactiva la misma fila en vez de crear otra.
        UniqueConstraint("actividad_id", "alumno_id", name="uq_inscripcion_actividad_alumno"),
        CheckConstraint("estado IN ('inscrita','cancelada')", name="ck_inscripcion_estado"),
        Index("ix_inscripciones_actividad_estado", "actividad_id", "estado"),
    )


# ---------- TEC-16: usuarios, organizadores, categorías, pagos e institución ----------
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


class Organizador(Base):
    __tablename__ = "organizadores"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(120), nullable=False)
    cargo: Mapped[str] = mapped_column(String(80), nullable=False)
    email: Mapped[str] = mapped_column(String(180), nullable=False, unique=True)
    usuario_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True, unique=True)
    activo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=text("true"))


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

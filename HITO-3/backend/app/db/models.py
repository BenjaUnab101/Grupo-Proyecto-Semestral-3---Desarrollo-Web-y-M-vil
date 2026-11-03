from datetime import date, datetime
from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
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

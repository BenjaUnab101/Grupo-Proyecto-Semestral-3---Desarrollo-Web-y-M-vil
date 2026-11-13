from pydantic_settings import BaseSettings, SettingsConfigDict

# R4 · Matiz A (Sprint 3 · Daniel): APP_ENV es OBLIGATORIO y explícito.
#  - Valores válidos: development, test, staging, production (se ignoran espacios y mayúsculas).
#  - Ausente, vacío o desconocido ("prod", "dev", "desarrollo"…) -> la aplicación NO inicia
#    (ConfiguracionInvalida). Ya no existe un valor por defecto.
#  - Solo development/test admiten identidad y contraseñas demo, y solo si se piden explícitamente.
#  - staging/production con PERMITIR_IDENTIDAD_DEMO=true o DEMO_PASSWORD definida -> no inicia.
ENTORNOS_DE_DESARROLLO = {"development", "test"}
ENTORNOS_PROTEGIDOS = {"staging", "production"}
ENTORNOS_VALIDOS = ENTORNOS_DE_DESARROLLO | ENTORNOS_PROTEGIDOS


class ConfiguracionInvalida(RuntimeError):
    """Configuración insegura o incompleta: la API se niega a iniciar."""


class Settings(BaseSettings):
    # Sin valor por defecto a propósito (R4 · Matiz A). Se valida en validar_configuracion().
    app_env: str | None = None
    api_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg://pequenos_reyes:pequenos_reyes@localhost:5432/pequenos_reyes"
    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_database: str = "pequenos_reyes"
    cors_origins: str = "http://localhost:5173,http://localhost,https://localhost,capacitor://localhost"

    # HU-16 (Sprint 3 · Daniel): autenticación real con sesiones en PostgreSQL.
    # Minutos que dura una sesión desde el login (luego el token deja de servir: 401).
    sesion_minutos: int = 120
    # Iteraciones de PBKDF2-SHA256 para los hashes de contraseña.
    hash_iteraciones: int = 310_000
    # Compatibilidad TRANSITORIA con la sesión demo de TEC-17 (X-Usuario-Id) y con X-Rol sin
    # sesión. R4: desactivada por defecto; hay que pedirla explícitamente y solo en development/test.
    permitir_identidad_demo: bool = False
    # Contraseña de las cuentas ficticias @ejemplo.cl (solo development/test). Vacía = no se asigna.
    # Nunca se escribe en el código: viene del entorno (.env, ver .env.example).
    demo_password: str = ""

    # HU-22: días que se conserva la bitácora de auditoría en MongoDB (índice TTL).
    auditoria_retencion_dias: int = 365

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def entorno(self) -> str:
        """APP_ENV normalizado (sin espacios, en minúsculas)."""
        return (self.app_env or "").strip().lower()

    @property
    def es_entorno_de_desarrollo(self) -> bool:
        # Lista PERMITIDA: cualquier otro valor (incluso si se cambia en caliente) se trata
        # como producción. Falla del lado seguro.
        return self.entorno in ENTORNOS_DE_DESARROLLO

    @property
    def identidad_demo_activa(self) -> bool:
        # La identidad demo (X-Usuario-Id, X-Rol sin sesión) solo puede existir en desarrollo,
        # aunque PERMITIR_IDENTIDAD_DEMO diga true.
        return self.permitir_identidad_demo and self.es_entorno_de_desarrollo

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


def validar_configuracion(config: Settings) -> Settings:
    """R4 · Matiz A: falla en cerrado. Lanza ConfiguracionInvalida con un mensaje claro
    (sin mostrar valores secretos) si la configuración permitiría iniciar en modo demo por error."""
    if not config.entorno:
        raise ConfiguracionInvalida(
            "APP_ENV es obligatorio y no está definido. Valores válidos: "
            + ", ".join(sorted(ENTORNOS_VALIDOS)) + ". Ver .env.example."
        )
    if config.entorno not in ENTORNOS_VALIDOS:
        raise ConfiguracionInvalida(
            f"APP_ENV={config.app_env!r} no es válido. Valores válidos: " + ", ".join(sorted(ENTORNOS_VALIDOS)) + "."
        )
    if config.entorno in ENTORNOS_PROTEGIDOS:
        if config.permitir_identidad_demo:
            raise ConfiguracionInvalida(
                f"APP_ENV={config.entorno} no admite PERMITIR_IDENTIDAD_DEMO=true (identidad demo)."
            )
        if config.demo_password:
            raise ConfiguracionInvalida(
                f"APP_ENV={config.entorno} no admite DEMO_PASSWORD: las credenciales demo son solo para development/test."
            )
    return config


settings = validar_configuracion(Settings())

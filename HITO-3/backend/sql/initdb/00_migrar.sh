#!/bin/sh
# Se ejecuta solo la PRIMERA vez que arranca PostgreSQL con un volumen vacío
# (mecanismo docker-entrypoint-initdb.d de la imagen oficial).
# Aplica todas las migraciones y carga los datos de demostración.
set -e
sh /sql/migrar.sh

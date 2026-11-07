#!/bin/bash
# HU-19 · CA2: prueba de control de cupo con concurrencia directamente en PostgreSQL.
#
# Lanza 6 sesiones SIMULTÁNEAS que intentan inscribir a 6 alumnos demo en una actividad
# con cupo 2, usando la misma secuencia que app/services/inscripciones.py:
#   1) bloquear la actividad (SELECT ... FOR UPDATE), 2) contar inscritos, 3) insertar si hay cupo.
# Se agrega una pausa de 0,3 s entre contar e insertar para que la carrera sea visible.
#
# Uso (desde HITO-3/backend, con docker compose levantado y las migraciones aplicadas), en Git Bash:
#   bash docs/evidencia/HU-19/concurrencia-postgresql.sh con 1   # con FOR UPDATE (como la API)
#   bash docs/evidencia/HU-19/concurrencia-postgresql.sh sin 1   # control SIN bloqueo
#   bash docs/evidencia/HU-19/concurrencia-postgresql.sh con 1 ver   # muestra el motivo de los rechazos
#
# Al final borra la actividad de prueba (CONC-*) y sus inscripciones.

MODO=${1:-con}; RONDA=${2:-1}
PSQL=${PSQL:-"docker compose exec -T postgres psql -U pequenos_reyes -d pequenos_reyes -q -t -A"}
P() { $PSQL -c "$1" | tr -d '\r'; }

ACT=$(P "INSERT INTO actividades (codigo,titulo,fecha,cupo_maximo) VALUES ('CONC-$MODO-$RONDA-$$','Prueba concurrencia',CURRENT_DATE+3,2) RETURNING id")
AP1=$(P "SELECT id FROM apoderados WHERE email='apoderado.demo1@ejemplo.cl'")
AP2=$(P "SELECT id FROM apoderados WHERE email='apoderado.demo2@ejemplo.cl'")
LOCK=""; [ "$MODO" = "con" ] && LOCK="FOR UPDATE"
OUT=$(mktemp -d)

for N in 1 2 3 4 5 6; do
  AL=$(P "SELECT id FROM alumnos WHERE codigo='DEMO-A0$N'"); AP=$AP1; [ $N = 6 ] && AP=$AP2
  ( $PSQL -c "DO \$\$
     DECLARE v_cupo int; v_inscritos int;
     BEGIN
       SELECT cupo_maximo INTO v_cupo FROM actividades WHERE id = $ACT $LOCK;
       SELECT count(*) INTO v_inscritos FROM inscripciones WHERE actividad_id = $ACT AND estado = 'inscrita';
       PERFORM pg_sleep(0.3);
       IF v_inscritos >= v_cupo THEN RAISE EXCEPTION 'SOBRECUPO'; END IF;
       INSERT INTO inscripciones (actividad_id, alumno_id, apoderado_id) VALUES ($ACT, $AL, $AP);
     END \$\$;" >/dev/null 2>$OUT/err$N && echo ok > $OUT/r$N || echo rechazada > $OUT/r$N ) &
done
wait

OK=$(grep -l ok $OUT/r* | wc -l); RE=$(grep -l rechazada $OUT/r* | wc -l)
EN_BASE=$(P "SELECT count(*) FROM v_asistentes_actividad WHERE actividad_id=$ACT AND estado='inscrita'")
echo "$MODO FOR UPDATE · ronda $RONDA: aceptadas=$OK rechazadas=$RE · inscritas en la base=$EN_BASE (cupo 2)"
[ "$3" = "ver" ] && cat $OUT/err* | grep ERROR | sort | uniq -c

P "DELETE FROM inscripciones WHERE actividad_id=$ACT; DELETE FROM actividades WHERE id=$ACT" >/dev/null
rm -rf $OUT

#!/bin/bash
# HU-21 · Pruebas de comunicados directamente en PostgreSQL (vigencia, pertinencia y restricciones).
# Uso con Docker (Git Bash, desde HITO-3/backend), después de: docker compose exec postgres sh /sql/migrar.sh
#   bash docs/evidencia/HU-21/pruebas-postgresql.sh
# Solo LEE la base pequenos_reyes; los intentos inválidos se hacen dentro de transacciones que se deshacen.
set -u
PSQL=${PSQL:-"docker compose exec -T postgres psql -U pequenos_reyes -d pequenos_reyes"}
q() { $PSQL -X -q -c "$1" 2>&1 | tr -d '\r'; }
VIG="c.publicado AND c.fecha_publicacion <= now() AND (c.vigente_hasta IS NULL OR c.vigente_hasta >= (now() AT TIME ZONE 'America/Santiago')::date)"
NIV="SELECT 'General'::text AS n UNION SELECT s.grupo_comunicados FROM apoderados a JOIN apoderados_alumnos aa ON aa.apoderado_id = a.id JOIN matriculas m ON m.alumno_id = aa.alumno_id AND m.anio_escolar = extract(year FROM now() AT TIME ZONE 'America/Santiago') AND m.estado <> 'anulada' JOIN salas s ON s.id = m.sala_id WHERE a.email = '%s'"

echo "=== Todos los comunicados demo y si son vigentes ==="
q "SELECT c.nivel, c.es_urgente AS urgente, c.publicado, (c.fecha_publicacion AT TIME ZONE 'America/Santiago')::date AS publicacion, c.vigente_hasta, ($VIG) AS vigente, c.titulo FROM comunicados c WHERE c.titulo NOT LIKE '[TEST%' ORDER BY c.fecha_publicacion DESC"

for ap in apoderado.demo1@ejemplo.cl apoderado.demo2@ejemplo.cl; do
  echo "=== Pertinentes y vigentes para $ap ==="
  N=$(printf "$NIV" "$ap")
  q "SELECT string_agg(n, ', ' ORDER BY n) AS niveles FROM ($N) x"
  q "SELECT c.nivel, c.titulo FROM comunicados c WHERE $VIG AND c.nivel IN (SELECT n FROM ($N) x) ORDER BY c.fecha_publicacion DESC"
done

echo "=== Restricciones (cada intento debe ser RECHAZADO; nada se guarda) ==="
U=$($PSQL -X -q -t -A -c "SELECT id FROM usuarios WHERE email='direccion.demo@ejemplo.cl'" | tr -d '\r')
t() { r=$(q "BEGIN; $2; ROLLBACK;" | grep -oE 'violates [a-z ]+constraint "[a-z_]+"' | head -1); [ -n "$r" ] && echo "RECHAZA  $1 ($r)" || echo "FALLA    $1 (se aceptó)"; }
t "nivel inexistente" "INSERT INTO comunicados (titulo,cuerpo,nivel,autor_usuario_id) VALUES ('Hola','x','Primaria',$U)"
t "título de 2 letras con espacios" "INSERT INTO comunicados (titulo,cuerpo,nivel,autor_usuario_id) VALUES ('  ab ','x','General',$U)"
t "cuerpo vacío" "INSERT INTO comunicados (titulo,cuerpo,nivel,autor_usuario_id) VALUES ('Válido','   ','General',$U)"
t "vigencia antes de la publicación" "INSERT INTO comunicados (titulo,cuerpo,nivel,autor_usuario_id,fecha_publicacion,vigente_hasta) VALUES ('Válido','x','General',$U,now(),current_date-5)"
t "autor inexistente" "INSERT INTO comunicados (titulo,cuerpo,nivel,autor_usuario_id) VALUES ('Válido','x','General',999999)"
t "borrar un usuario que publicó comunicados" "DELETE FROM usuarios WHERE id=$U"
t "sala con grupo de comunicados inválido" "UPDATE salas SET grupo_comunicados='Otro' WHERE nombre='Sala Demo TEL'"

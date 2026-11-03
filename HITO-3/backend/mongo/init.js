db = db.getSiblingDB("pequenos_reyes");
db.createCollection("comunicados", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["titulo", "cuerpo", "emisor_id", "nivel", "categoria", "publicado", "fecha_publicacion"],
      properties: {
        titulo: { bsonType: "string", minLength: 3, maxLength: 160 },
        cuerpo: { bsonType: "string", maxLength: 10000 },
        emisor_id: { bsonType: ["int", "long"] },
        alcance: { bsonType: "string", maxLength: 100 },
        nivel: { bsonType: "string", maxLength: 50 },
        categoria: { bsonType: "string", maxLength: 50 },
        es_urgente: { bsonType: "bool" },
        publicado: { bsonType: "bool" },
        fecha_publicacion: { bsonType: "date" }
      }
    }
  }
});
db.comunicados.createIndex({ publicado: 1, fecha_publicacion: -1 });
db.comunicados.createIndex({ nivel: 1, fecha_publicacion: -1 });

if (db.comunicados.countDocuments() === 0) {
  db.comunicados.insertMany([
    {
      titulo: "Suspensión de clases por alerta meteorológica",
      cuerpo: "Por el sistema frontal previsto para mañana, el jardín no abrirá. Las actividades se retoman el jueves en el horario habitual.",
      emisor_id: 1,
      alcance: "Todo el jardín",
      nivel: "General",
      categoria: "Suspensión",
      es_urgente: true,
      publicado: true,
      fecha_publicacion: ISODate("2026-09-29T12:00:00Z")
    },
    {
      titulo: "Reunión de apoderados nivel medio mayor",
      cuerpo: "La reunión será el miércoles 7 de octubre a las 18:30 en la sala de actividades. Se tratará el calendario del último trimestre.",
      emisor_id: 1,
      alcance: "Nivel medio mayor",
      nivel: "Preescolar",
      categoria: "Reunión",
      es_urgente: false,
      publicado: true,
      fecha_publicacion: ISODate("2026-09-25T12:00:00Z")
    },
    {
      titulo: "Campaña de vacunación escolar",
      cuerpo: "El consultorio vacunará en el jardín el 14 de octubre. Envíe la autorización firmada en la agenda antes del lunes 12.",
      emisor_id: 1,
      alcance: "Todo el jardín",
      nivel: "General",
      categoria: "Salud",
      es_urgente: true,
      publicado: true,
      fecha_publicacion: ISODate("2026-09-18T12:00:00Z")
    },
    {
      titulo: "Material para la semana de la lectura",
      cuerpo: "Cada niño puede traer un cuento favorito, con su nombre en la tapa, desde el lunes 5 de octubre.",
      emisor_id: 1,
      alcance: "Nivel transición",
      nivel: "Preescolar",
      categoria: "Actividades",
      es_urgente: false,
      publicado: true,
      fecha_publicacion: ISODate("2026-09-10T12:00:00Z")
    },
    {
      titulo: "Horario de invierno vigente",
      cuerpo: "El horario de ingreso se mantiene a las 8:30 y la salida a las 16:00 mientras no se informe otra cosa.",
      emisor_id: 1,
      alcance: "Todo el jardín",
      nivel: "General",
      categoria: "Horarios",
      es_urgente: false,
      publicado: true,
      fecha_publicacion: ISODate("2026-08-03T12:00:00Z")
    }
  ]);
}
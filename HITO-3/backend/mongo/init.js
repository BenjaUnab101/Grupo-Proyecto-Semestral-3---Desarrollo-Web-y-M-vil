// MongoDB de Pequeños Reyes.
//
// HU-21: los comunicados pasaron a PostgreSQL (tabla comunicados, migración V004).
// MongoDB guarda la BITÁCORA de cambios de los comunicados: cada vez que dirección o el
// personal crea, edita o elimina uno, se registra quién lo hizo, cuándo y qué cambió.
// Si se elimina un comunicado, su contenido queda aquí.
//
// Este script solo se ejecuta con un volumen de MongoDB VACÍO. En un volumen existente,
// la colección se crea sola con el primer registro (sin el validador de abajo).

db = db.getSiblingDB("pequenos_reyes");

db.createCollection("bitacora_comunicados", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["comunicado_id", "accion", "usuario_id", "rol", "fecha", "cambios"],
      properties: {
        comunicado_id: { bsonType: ["int", "long"], minimum: 1 },
        accion: { enum: ["crear", "editar", "eliminar"] },
        usuario_id: { bsonType: ["int", "long"], minimum: 1 },
        rol: { enum: ["administrador", "organizador", "apoderado"] },
        fecha: { bsonType: "date" },
        cambios: { bsonType: "object" }
      }
    }
  }
});

db.bitacora_comunicados.createIndex({ comunicado_id: 1, fecha: 1 });
db.bitacora_comunicados.createIndex({ usuario_id: 1, fecha: -1 });

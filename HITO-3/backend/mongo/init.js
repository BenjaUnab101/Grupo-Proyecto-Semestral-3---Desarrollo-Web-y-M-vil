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

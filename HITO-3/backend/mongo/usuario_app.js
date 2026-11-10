// Crea o actualiza (idempotente) la cuenta de la API con privilegios mínimos:
// readWrite SOLO en la base pequenos_reyes. Lee usuario y clave de las variables del contenedor;
// nunca las imprime.
(function () {
  const usuario = process.env.MONGO_APP_USER;
  const clave = process.env.MONGO_APP_PASSWORD;
  if (!usuario || !clave) { throw new Error("Faltan MONGO_APP_USER o MONGO_APP_PASSWORD"); }
  const base = db.getSiblingDB("pequenos_reyes");
  const roles = [{ role: "readWrite", db: "pequenos_reyes" }];
  if (base.getUser(usuario)) {
    base.updateUser(usuario, { pwd: clave, roles: roles });
    print("usuario de la API actualizado");
  } else {
    base.createUser({ user: usuario, pwd: clave, roles: roles });
    print("usuario de la API creado");
  }
})();

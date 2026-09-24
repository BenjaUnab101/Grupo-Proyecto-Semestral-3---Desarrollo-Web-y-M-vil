import { useState } from "react";

export default function FormMascota({ onRegistrar }) {
  const [nombre, setNombre] = useState("");
  const [especie, setEspecie] = useState("Perro");
  const [edad, setEdad] = useState("");

  function manejarSubmit(event) {
    event.preventDefault();
    if (nombre.trim() === "" || edad === "") {
      return;
    }

    const nuevaMascota = {
      nombre: nombre.trim(),
      especie,
      edad: Number(edad),
      vacunada: false
    };

    onRegistrar(nuevaMascota);
    setNombre("");
    setEspecie("Perro");
    setEdad("");
  }

  return (
    <form className="formulario" onSubmit={manejarSubmit}>
      <h2>Registrar mascota</h2>
      <input
        type="text"
        placeholder="Nombre"
        value={nombre}
        onChange={(event) => setNombre(event.target.value)}
      />
      <select
        value={especie}
        onChange={(event) => setEspecie(event.target.value)}
      >
        <option value="Perro">Perro</option>
        <option value="Gato">Gato</option>
      </select>
      <input
        type="number"
        min="0"
        placeholder="Edad"
        value={edad}
        onChange={(event) => setEdad(event.target.value)}
      />
      <button type="submit">Registrar</button>
    </form>
  );
}
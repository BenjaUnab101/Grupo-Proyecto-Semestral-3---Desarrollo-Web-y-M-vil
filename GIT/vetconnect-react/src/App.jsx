import { useEffect, useState } from "react";
import Header from "./components/Header";
import MascotaCard from "./components/MascotaCard";
import FormMascota from "./components/FormMascota";
import "./App.css";

export default function App() {
  const [mascotas, setMascotas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // Paso 25: Carga inicial de datos vía GET
  async function cargarMascotas() {
    try {
      setCargando(true);
      setError("");
      const respuesta = await fetch("http://localhost:3000/mascotas");
      if (!respuesta.ok) {
        throw new Error("No fue posible cargar las mascotas");
      }
      const datos = await respuesta.json();
      setMascotas(datos);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  // Paso 26: Ejecución al montar el componente
  useEffect(() => {
    cargarMascotas();
  }, []);

  // Paso 29: Registro persistente mediante POST
  async function registrarMascota(nuevaMascota) {
    try {
      setError("");
      const respuesta = await fetch("http://localhost:3000/mascotas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(nuevaMascota),
      });

      if (!respuesta.ok) {
        throw new Error("No fue posible registrar la mascota");
      }

      const mascotaCreada = await respuesta.json();
      setMascotas([...mascotas, mascotaCreada]);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <Header />
      <main className="contenedor">
        <FormMascota onRegistrar={registrarMascota} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2>Mascotas</h2>
          {/* Paso 31: Botón Recargar */}
          <button 
            onClick={cargarMascotas} 
            disabled={cargando}
            style={{ padding: "8px 16px", cursor: cargando ? "not-allowed" : "pointer" }}
          >
            {cargando ? "Cargando..." : "Recargar mascotas"}
          </button>
        </div>

        {/* Paso 27: Estados visuales de carga, error y lista vacía */}
        {cargando && <p>Cargando mascotas...</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}
        {!cargando && !error && mascotas.length === 0 && (
          <p>No hay mascotas registradas.</p>
        )}

        <section className="lista-mascotas">
          {mascotas.map((mascota) => (
            <MascotaCard
              key={mascota.id}
              nombre={mascota.nombre}
              especie={mascota.especie}
              edad={mascota.edad}
              vacunada={mascota.vacunada}
            />
          ))}
        </section>
      </main>
    </>
  );
}
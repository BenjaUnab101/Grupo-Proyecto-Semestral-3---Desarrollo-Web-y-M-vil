export default function MascotaCard({
  nombre,
  especie,
  edad,
  vacunada
}) {
  return (
    <article className="mascota-card">
      <h3>{nombre}</h3>
      <p>Especie: {especie}</p>
      <p>Edad: {edad} años</p>
      <p>
        {vacunada
          ? "Vacunación al día"
          : "Vacunación pendiente"}
      </p>
    </article>
  );
}
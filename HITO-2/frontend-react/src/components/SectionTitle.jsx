export default function SectionTitle({ id, titulo, subtitulo }) {
  return (
    <div id={id} className="text-center py-4 my-2">
      <h2 className="display-6 fw-bold" style={{ color: 'var(--pr-blue)' }}>
        {titulo}
      </h2>
      {subtitulo && <p className="text-muted lead fs-6">{subtitulo}</p>}
    </div>
  );
}

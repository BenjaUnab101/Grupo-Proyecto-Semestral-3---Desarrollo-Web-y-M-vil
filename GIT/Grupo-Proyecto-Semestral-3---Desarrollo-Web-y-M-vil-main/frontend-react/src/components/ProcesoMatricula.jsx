import { useState } from 'react'
import matricula from '../data/matricula.json'
import Modal from './Modal.jsx'

// Proceso de matrícula informativo (demo): no envía postulaciones ni confirma cupos reales.
export default function ProcesoMatricula() {
  const [modalTransferenciaVisible, setModalTransferenciaVisible] = useState(false)
  const { etapas, transferenciaDemo } = matricula

  return (
    <div>
      <ol className="list-group list-group-numbered mb-3">
        {etapas.map((etapa) => (
          <li key={etapa.id} className="list-group-item">
            <strong>{etapa.titulo}.</strong> {etapa.descripcion}
          </li>
        ))}
      </ol>

      <button
        type="button"
        className="btn btn-outline-secondary btn-sm"
        onClick={() => setModalTransferenciaVisible(true)}
      >
        Ver datos de transferencia (demo)
      </button>

      {modalTransferenciaVisible && (
        <Modal titulo="Datos de transferencia (demo)" onCerrar={() => setModalTransferenciaVisible(false)}>
          <div className="alert alert-warning py-2" role="alert">
            Esta información es ficticia. No corresponde a una cuenta bancaria real: no realices transferencias
            a estos datos.
          </div>
          <dl className="row mb-0">
            <dt className="col-sm-4">Banco</dt>
            <dd className="col-sm-8">{transferenciaDemo.banco}</dd>

            <dt className="col-sm-4">Tipo de cuenta</dt>
            <dd className="col-sm-8">{transferenciaDemo.tipoCuenta}</dd>

            <dt className="col-sm-4">Número</dt>
            <dd className="col-sm-8">{transferenciaDemo.numeroCuenta}</dd>

            <dt className="col-sm-4">Titular</dt>
            <dd className="col-sm-8">{transferenciaDemo.titular}</dd>

            <dt className="col-sm-4">RUT titular</dt>
            <dd className="col-sm-8">{transferenciaDemo.rutTitular}</dd>

            <dt className="col-sm-4">Correo</dt>
            <dd className="col-sm-8">{transferenciaDemo.email}</dd>
          </dl>
        </Modal>
      )}
    </div>
  )
}

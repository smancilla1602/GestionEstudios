import Modal from './Modal';
import Toast from './Toast';
import EmpleadoForm from './EmpleadoForm';
import EstudioForm from './EstudioForm';
import EmpleadoDetalle from './EmpleadoDetalle';

/** Renderiza los modales compartidos de gestión y el sistema de avisos. */
export default function GestionModales({ gestion }) {
  const {
    detalle,
    cerrarDetalle,
    formEmpleado,
    cerrarFormEmpleado,
    formEstudio,
    cerrarFormEstudio,
    abrirFormEstudio,
    abrirFormEmpleado,
    guardarEmpleado,
    guardarEstudio,
    eliminarEmpleado,
    eliminarEstudio,
    toast,
    cerrarToast
  } = gestion;

  return (
    <>
      <Modal
        abierto={Boolean(formEmpleado)}
        onCerrar={cerrarFormEmpleado}
        titulo={formEmpleado?.empleado ? 'Editar empleado' : 'Registrar empleado'}
        descripcion="Los campos con * son obligatorios."
      >
        {formEmpleado ? (
          <EmpleadoForm
            key={formEmpleado.empleado?.id ?? 'nuevo-empleado'}
            empleado={formEmpleado.empleado}
            onGuardar={guardarEmpleado}
            onCancelar={cerrarFormEmpleado}
          />
        ) : null}
      </Modal>

      <Modal
        abierto={Boolean(formEstudio)}
        onCerrar={cerrarFormEstudio}
        titulo={formEstudio?.estudio ? 'Editar estudio médico' : 'Registrar estudio médico'}
        descripcion="La fecha de vencimiento se calcula automáticamente con la vigencia del tipo de estudio."
        ancho="max-w-3xl"
      >
        {formEstudio ? (
          <EstudioForm
            key={formEstudio.estudio?.id ?? `nuevo-estudio-${formEstudio.empleado?.id}`}
            empleado={formEstudio.empleado}
            estudio={formEstudio.estudio}
            onGuardar={guardarEstudio}
            onCancelar={cerrarFormEstudio}
          />
        ) : null}
      </Modal>

      <Modal
        abierto={Boolean(detalle)}
        onCerrar={cerrarDetalle}
        titulo="Detalle del empleado"
        descripcion="Semáforo de acceso y estudios registrados"
        ancho="max-w-4xl"
      >
        {detalle ? (
          <EmpleadoDetalle
            empleado={detalle}
            onAgregarEstudio={(empleado) => abrirFormEstudio(empleado)}
            onEditarEstudio={(empleado, estudio) => abrirFormEstudio(empleado, estudio)}
            onEliminarEstudio={eliminarEstudio}
            onEditarEmpleado={(empleado) => abrirFormEmpleado(empleado)}
            onEliminarEmpleado={eliminarEmpleado}
          />
        ) : null}
      </Modal>

      <Toast toast={toast} onCerrar={cerrarToast} />
    </>
  );
}

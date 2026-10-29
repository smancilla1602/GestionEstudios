import { estiloSemaforo } from '../lib/format';

export default function SemaforoBadge({ estado, compacto = false }) {
  const estilo = estiloSemaforo(estado);

  return (
    <span className={`badge ${estilo.badge} ${compacto ? 'px-2 py-0.5 text-[10px]' : ''}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${estilo.punto}`} />
      {estilo.etiqueta}
    </span>
  );
}

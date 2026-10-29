const TONOS = {
  slate: {
    icono: 'bg-slate-800/70 text-slate-300 ring-slate-700/60',
    valor: 'text-slate-100',
    activo: 'border-slate-500/60 ring-2 ring-slate-500/20'
  },
  emerald: {
    icono: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/25',
    valor: 'text-emerald-300',
    activo: 'border-emerald-500/50 ring-2 ring-emerald-500/20'
  },
  amber: {
    icono: 'bg-amber-500/10 text-amber-400 ring-amber-500/25',
    valor: 'text-amber-300',
    activo: 'border-amber-500/50 ring-2 ring-amber-500/20'
  },
  rose: {
    icono: 'bg-rose-500/10 text-rose-400 ring-rose-500/25',
    valor: 'text-rose-300',
    activo: 'border-rose-500/50 ring-2 ring-rose-500/20'
  }
};

export default function StatCard({
  titulo,
  valor,
  descripcion,
  Icono,
  tono = 'slate',
  activo = false,
  onClick
}) {
  const estilos = TONOS[tono] ?? TONOS.slate;
  const interactivo = typeof onClick === 'function';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactivo}
      className={`card group relative overflow-hidden p-5 text-left transition ${
        interactivo ? 'hover:-translate-y-0.5 hover:border-slate-700' : 'cursor-default'
      } ${activo ? estilos.activo : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{titulo}</p>
          <p className={`mt-2 text-3xl font-black tabular-nums tracking-tight ${estilos.valor}`}>
            {valor}
          </p>
          {descripcion ? (
            <p className="mt-1 text-xs text-slate-500">{descripcion}</p>
          ) : null}
        </div>
        {Icono ? (
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 ring-inset ${estilos.icono}`}>
            <Icono size={19} />
          </span>
        ) : null}
      </div>
      {activo ? (
        <span className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-emerald-400/60 to-transparent" />
      ) : null}
    </button>
  );
}

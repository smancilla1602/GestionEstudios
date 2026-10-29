import { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

export default function Toast({ toast, onCerrar }) {
  useEffect(() => {
    if (!toast) return undefined;
    const temporizador = setTimeout(() => onCerrar(), toast.duracion ?? 6000);
    return () => clearTimeout(temporizador);
  }, [toast, onCerrar]);

  if (!toast) return null;

  const esError = toast.tipo === 'error';

  return (
    <div className="fixed bottom-6 right-6 z-[60] w-[min(420px,calc(100vw-3rem))] animate-fade-in">
      <div
        className={`flex items-start gap-3 rounded-2xl border p-4 shadow-2xl shadow-black/50 backdrop-blur ${
          esError
            ? 'border-rose-500/40 bg-rose-950/90'
            : 'border-emerald-500/40 bg-emerald-950/90'
        }`}
        role="status"
      >
        {esError ? (
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-rose-400" />
        ) : (
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-400" />
        )}

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">
            {esError ? 'No se pudo completar la operación' : 'Operación completada'}
          </p>
          <p className="mt-0.5 break-words text-xs leading-relaxed text-slate-300">{toast.texto}</p>
          {toast.accion ? (
            <button
              type="button"
              onClick={toast.accion.onClick}
              className="mt-2 text-xs font-bold text-emerald-300 underline-offset-2 hover:text-emerald-200 hover:underline"
            >
              {toast.accion.etiqueta}
            </button>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onCerrar}
          className="shrink-0 rounded-lg p-1 text-slate-500 transition hover:bg-slate-800 hover:text-slate-200"
          title="Cerrar aviso"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

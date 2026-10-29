import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({
  abierto,
  onCerrar,
  titulo,
  descripcion,
  children,
  pie,
  ancho = 'max-w-2xl'
}) {
  useEffect(() => {
    if (!abierto) return undefined;

    const manejarTecla = (evento) => {
      if (evento.key === 'Escape') onCerrar?.();
    };

    document.addEventListener('keydown', manejarTecla);
    const overflowOriginal = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', manejarTecla);
      document.body.style.overflow = overflowOriginal;
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onCerrar?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`my-4 w-full ${ancho} animate-scale-in overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/50`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white">{titulo}</h2>
            {descripcion ? <p className="mt-0.5 text-xs text-slate-400">{descripcion}</p> : null}
          </div>
          <button type="button" onClick={onCerrar} className="icon-btn shrink-0" title="Cerrar">
            <X size={16} />
          </button>
        </header>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>

        {pie ? (
          <footer className="flex items-center justify-end gap-2 border-t border-slate-800 bg-slate-900/80 px-6 py-3">
            {pie}
          </footer>
        ) : null}
      </div>
    </div>,
    document.body
  );
}

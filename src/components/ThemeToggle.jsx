import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

/**
 * Botón discreto para alternar entre modo oscuro y claro.
 * Muestra el icono del tema al que se cambiará.
 */
export default function ThemeToggle({ className = '' }) {
  const { tema, esOscuro, alternarTema } = useTheme();
  const etiqueta = esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';

  return (
    <button
      type="button"
      onClick={alternarTema}
      className={`icon-btn h-9 w-9 shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${className}`}
      title={etiqueta}
      aria-label={etiqueta}
      data-tema={tema}
    >
      <span key={tema} className="inline-flex animate-scale-in" aria-hidden="true">
        {esOscuro ? <Sun size={17} /> : <Moon size={17} />}
      </span>
    </button>
  );
}

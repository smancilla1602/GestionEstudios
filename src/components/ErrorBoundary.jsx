import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/** Evita que un error de renderizado deje la ventana en blanco. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ui] Error no controlado', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
          <div className="w-full max-w-lg rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-center">
            <AlertTriangle size={34} className="mx-auto text-rose-400" />
            <h1 className="mt-3 text-lg font-bold text-white">Ocurrió un error en la interfaz</h1>
            <p className="mt-1 break-words text-sm text-rose-200">{this.state.error.message}</p>
            <p className="mt-2 text-xs text-slate-400">
              Los datos guardados en SQLite no se ven afectados.
            </p>
            <button
              type="button"
              className="btn-primary mt-5"
              onClick={() => window.location.reload()}
            >
              <RefreshCw size={16} />
              Recargar aplicación
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

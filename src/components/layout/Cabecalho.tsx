import { Monitor, RefreshCw, Github } from "lucide-react";
import { Link } from "react-router-dom";

export default function Header() {
  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[hsl(var(--color-info))/15] flex items-center justify-center">
            <Monitor className="w-5 h-5 text-[hsl(var(--color-info))]" />
          </div>
          <div>
            <h1 className="font-bold text-sm leading-tight text-foreground">IT Inventário</h1>
            <p className="text-[10px] text-muted-foreground leading-tight">Painel de Ativos</p>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="capitalize">{today}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Atualizar página"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-xs font-mono text-muted-foreground">
            <span>\\192.168.0.10\inventario</span>
          </div>
        </div>
      </div>
    </header>
  );
}

import { Monitor, RefreshCw } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

interface HeaderProps {
  onRefreshDirectory?: (forceSelect?: boolean) => Promise<void>;
  isRefreshing?: boolean;
}

export default function Header({ onRefreshDirectory, isRefreshing = false }: HeaderProps) {
  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
  const navigate = useNavigate();

  const handleRefreshClick = async () => {
    if (isRefreshing) return;
    if (onRefreshDirectory) {
      await onRefreshDirectory(false);
    } else {
      navigate("/?sync=true");
    }
  };

  const handleBadgeClick = async () => {
    if (isRefreshing) return;
    if (onRefreshDirectory) {
      await onRefreshDirectory(true);
    } else {
      navigate("/?sync=true&select=true");
    }
  };

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
            className={`w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground ${
              isRefreshing ? "opacity-60 cursor-not-allowed" : ""
            }`}
            title={isRefreshing ? "Atualizando..." : "Sincronizar pasta de rede"}
            onClick={handleRefreshClick}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[hsl(var(--color-info))]" : ""}`} />
          </button>
          <button
            onClick={handleBadgeClick}
            disabled={isRefreshing}
            className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-xs font-mono text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all border border-transparent hover:border-border cursor-pointer select-none ${
              isRefreshing ? "opacity-60 cursor-not-allowed pointer-events-none" : ""
            }`}
            title="Clique para selecionar outra pasta de rede"
          >
            <span>\\192.168.0.10\inventario</span>
          </button>
        </div>
      </div>
    </header>
  );
}


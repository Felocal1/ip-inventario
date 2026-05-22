import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Header from "@/components/layout/Header";
import MachineCard from "@/components/features/MachineCard";
import FileUploader from "@/components/features/FileUploader";
import { ScrollArea } from "@/components/ui/area-de-rolagem";
import { parseInventoryHTML, loadInventories, saveInventories, removeInventory } from "@/lib/parseInventory";
import { useAutoLoadInventories } from "@/hooks/use-auto-load-inventories";
import type { MachineInventory } from "@/types/inventario";
import { Search, Server, HardDrive, Monitor, Activity, ChevronDown, SlidersHorizontal, X } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

type FilterOS = "all" | "win11" | "win10" | "server" | "other";
type FilterStatus = "all" | "today";
type SortBy = "name" | "date" | "ip" | "ram";

export default function Index() {
  const [machines, setMachines] = useState<MachineInventory[]>(loadInventories);
  const [search, setSearch] = useState("");
  const [showUploader, setShowUploader] = useState(false);
  const [filterOS, setFilterOS] = useState<FilterOS>("all");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();

  // Carregar inventários automaticamente se localStorage estiver vazio
  useAutoLoadInventories();

  const filtered = useMemo(() => {
    let list = [...machines];

    // Search
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        m.machineName.toLowerCase().includes(q) ||
        m.osName.toLowerCase().includes(q) ||
        m.primaryIP.includes(q) ||
        m.model.toLowerCase().includes(q) ||
        m.manufacturer.toLowerCase().includes(q) ||
        m.processorName.toLowerCase().includes(q) ||
        m.serviceTag.toLowerCase().includes(q)
      );
    }

    // OS filter
    if (filterOS !== "all") {
      list = list.filter(m => {
        const os = m.osName.toLowerCase();
        if (filterOS === "win11") return os.includes("11");
        if (filterOS === "win10") return os.includes("10");
        if (filterOS === "server") return os.includes("server");
        if (filterOS === "other") return !os.includes("windows");
        return true;
      });
    }

    // Status filter
    if (filterStatus === "today") {
      list = list.filter(m => new Date(m.uploadDate).toDateString() === new Date().toDateString());
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === "name") return a.machineName.localeCompare(b.machineName);
      if (sortBy === "date") return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
      if (sortBy === "ip") return a.primaryIP.localeCompare(b.primaryIP);
      if (sortBy === "ram") return b.totalMemoryMB - a.totalMemoryMB;
      return 0;
    });

    return list;
  }, [machines, search, filterOS, filterStatus, sortBy]);

  const handleFilesLoaded = (files: Array<{ name: string; content: string }>) => {
    console.log("[Index] handleFilesLoaded called with", files.length, "files");
    const current = loadInventories();
    const newMachines: MachineInventory[] = [];
    let updated = 0;

    let errors = 0;
    files.forEach(({ name, content }) => {
      try {
        console.log(`[Index] Processing file: ${name}, size: ${content.length}`);
        if (!content || content.length < 100) {
          console.warn("[Index] File too small or empty:", name);
          toast.error(`Arquivo vazio ou inválido: ${name}`);
          errors++;
          return;
        }
        const parsed = parseInventoryHTML(content, name);
        console.log(`[Index] Parsed machine: ${parsed.machineName}, IP: ${parsed.primaryIP}`);
        const existIdx = current.findIndex(m => m.machineName === parsed.machineName);
        if (existIdx >= 0) {
          current[existIdx] = parsed;
          updated++;
        } else {
          newMachines.push(parsed);
        }
      } catch (err) {
        console.error("[Index] Error parsing file:", name, err);
        toast.error(`Erro ao processar ${name}: ${err instanceof Error ? err.message : String(err)}`);
        errors++;
      }
    });

    console.log(`[Index] Summary: new=${newMachines.length}, updated=${updated}, errors=${errors}`);
    const result = [...current, ...newMachines];
    setMachines(result);
    const hadSuccess = newMachines.length > 0 || updated > 0;
    if (hadSuccess) {
      setShowUploader(false);
    }

    const saved = saveInventories(result);
    if (!saved) {
      toast.error("Não foi possível salvar os dados no navegador. Limpe o armazenamento local ou remova registros antigos.");
    }

    if (hadSuccess) {
      toast.success(`${newMachines.length} adicionada(s), ${updated} atualizada(s)`);
    } else if (errors === 0 && files.length > 0) {
      toast.info("Arquivos processados mas nenhum dado extraído — verifique o formato.");
    }
  };

  const handleDelete = (id: string) => {
    const result = removeInventory(id);
    setMachines(result);
    toast.success("Inventário removido");
  };

  const clearFilters = () => {
    setSearch("");
    setFilterOS("all");
    setFilterStatus("all");
    setSortBy("date");
  };

  const hasActiveFilters = search || filterOS !== "all" || filterStatus !== "all" || sortBy !== "date";

  // Stats
  const todayCount = machines.filter(m => new Date(m.uploadDate).toDateString() === new Date().toDateString()).length;
  const totalRunning = machines.reduce((a, m) => a + m.services.filter(s => s.status.toLowerCase() === "running").length, 0);
  const totalStopped = machines.reduce((a, m) => a + m.services.filter(s => s.status.toLowerCase() === "stopped").length, 0);
  const totalPartitions = machines.reduce((a, m) => a + m.partitions.length, 0);

  const win11Count = machines.filter(m => m.osName.toLowerCase().includes("11")).length;
  const win10Count = machines.filter(m => m.osName.toLowerCase().includes("10") && !m.osName.toLowerCase().includes("server")).length;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-8"
          style={{ backgroundImage: `url(${heroBg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/70 to-background" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[hsl(var(--color-info))/10] border border-[hsl(var(--color-info))/20] text-[hsl(var(--color-info))] text-xs font-medium mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--color-info))] animate-pulse" />
                Inventário Diário de Ativos de TI
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-1">
                Painel de Inventário IT
              </h1>
              <p className="text-muted-foreground text-sm max-w-lg">
                Visualize configurações das estações coletadas automaticamente pelo agente VBS ao iniciar.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:w-auto">
              <StatCard
                icon={<Monitor className="w-5 h-5" />}
                value={machines.length}
                label="Total de Máquinas"
                sub={`${todayCount} hoje`}
                color="cyan"
                featured
              />
              <StatCard icon={<Activity className="w-4 h-4" />} value={totalRunning} label="Serviços Ativos" sub={`${totalStopped} parados`} color="green" />
              <StatCard icon={<HardDrive className="w-4 h-4" />} value={totalPartitions} label="Partições" sub={`${machines.reduce((a,m) => a + m.diskDetails.length, 0)} discos`} color="blue" />
              <StatCard icon={<Server className="w-4 h-4" />} value={machines.reduce((a,m) => a + m.softwareList.length, 0)} label="Softwares" sub="total catalogados" color="purple" />
            </div>
          </div>

          {/* OS breakdown mini */}
          {machines.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 mt-5 pt-5 border-t border-border/40">
              <span className="text-xs text-muted-foreground">Sistemas:</span>
              {win11Count > 0 && <OSTick label="Windows 11" count={win11Count} color="violet" onClick={() => setFilterOS(f => f === "win11" ? "all" : "win11")} active={filterOS === "win11"} />}
              {win10Count > 0 && <OSTick label="Windows 10" count={win10Count} color="blue" onClick={() => setFilterOS(f => f === "win10" ? "all" : "win10")} active={filterOS === "win10"} />}
              {machines.filter(m => m.osName.toLowerCase().includes("server")).length > 0 && (
                <OSTick label="Windows Server" count={machines.filter(m => m.osName.toLowerCase().includes("server")).length} color="orange" onClick={() => setFilterOS(f => f === "server" ? "all" : "server")} active={filterOS === "server"} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 pt-6">

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome, IP, modelo, fabricante, Service Tag..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-[hsl(var(--color-surface-1))] border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[hsl(var(--color-info))]"
            />
            {search && (
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearch("")}>
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
              showFilters || hasActiveFilters
                ? "border-[hsl(var(--color-info))/50] text-[hsl(var(--color-info))] bg-[hsl(var(--color-info))/8]"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
            onClick={() => setShowFilters(v => !v)}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtros
            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-[hsl(var(--color-info))] shrink-0" />}
          </button>

          <button
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[hsl(var(--color-info))] text-[hsl(var(--primary-foreground))] text-sm font-semibold hover:opacity-90 transition-opacity shrink-0"
            onClick={() => setShowUploader(v => !v)}
          >
            + Carregar HTML
          </button>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="card-surface p-4 mb-4 flex flex-wrap gap-4 items-start">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-semibold">Sistema Operacional</p>
              <div className="flex flex-wrap gap-1.5">
                {(["all", "win11", "win10", "server"] as FilterOS[]).map(f => (
                  <button key={f}
                    onClick={() => setFilterOS(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      filterOS === f ? "bg-[hsl(var(--color-info))] text-[hsl(var(--primary-foreground))]" : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f === "all" ? "Todos" : f === "win11" ? "Windows 11" : f === "win10" ? "Windows 10" : "Server"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-semibold">Data</p>
              <div className="flex gap-1.5">
                {(["all", "today"] as FilterStatus[]).map(f => (
                  <button key={f}
                    onClick={() => setFilterStatus(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      filterStatus === f ? "bg-[hsl(var(--color-info))] text-[hsl(var(--primary-foreground))]" : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f === "all" ? "Todos" : "Hoje"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-semibold">Ordenar por</p>
              <div className="flex flex-wrap gap-1.5">
                {(["date", "name", "ip", "ram"] as SortBy[]).map(s => (
                  <button key={s}
                    onClick={() => setSortBy(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      sortBy === s ? "bg-[hsl(var(--color-info))] text-[hsl(var(--primary-foreground))]" : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s === "date" ? "Data" : s === "name" ? "Nome" : s === "ip" ? "IP" : "RAM"}
                  </button>
                ))}
              </div>
            </div>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="ml-auto self-end flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-3.5 h-3.5" />
                Limpar filtros
              </button>
            )}
          </div>
        )}

        {/* Uploader */}
        {showUploader && (
          <div className="mb-6">
            <FileUploader onFilesLoaded={handleFilesLoaded} />
          </div>
        )}

        {/* Results header */}
        {machines.length > 0 && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              Exibindo <span className="text-foreground font-semibold">{filtered.length}</span>
              {filtered.length !== machines.length && <span> de <span className="text-foreground font-semibold">{machines.length}</span></span>}
              {" "}máquina{filtered.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ChevronDown className="w-3 h-3" />
              <span>Clique em uma máquina para ver detalhes</span>
            </div>
          </div>
        )}

        {/* Empty state */}
        {machines.length === 0 && !showUploader && (
          <div className="text-center py-20">
            <div className="w-24 h-24 rounded-3xl bg-[hsl(var(--color-surface-2))] border border-border flex items-center justify-center mx-auto mb-5">
              <Monitor className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Nenhum inventário carregado</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm">
              Adicione os arquivos HTML gerados pelo script VBS para visualizar o inventário das estações de trabalho da rede.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                className="px-6 py-3 rounded-xl bg-[hsl(var(--color-info))] text-[hsl(var(--primary-foreground))] font-semibold hover:opacity-90 transition-opacity"
                onClick={() => setShowUploader(true)}
              >
                Carregar arquivos HTML
              </button>
              <div className="px-4 py-3 rounded-xl bg-muted text-xs text-muted-foreground font-mono flex items-center gap-2">
                <span>\\192.168.0.10\inventario\*.html</span>
              </div>
            </div>
          </div>
        )}

        {/* Grid */}
        {filtered.length > 0 && (
          <div className="card-surface p-4 mb-6 border border-border rounded-3xl">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Inventários carregados</p>
                <p className="text-xs text-muted-foreground">
                  Use a barra de rolagem para navegar pelos cards sem estender demais a página.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Exibindo <span className="font-semibold text-foreground">{filtered.length}</span> de <span className="font-semibold text-foreground">{machines.length}</span>
              </p>
            </div>
            <ScrollArea className="h-[62vh] min-h-[28rem] rounded-3xl border border-border">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
                {filtered.map(machine => (
                  <MachineCard
                    key={machine.id}
                    machine={machine}
                    onClick={() => navigate(`/machine/${machine.id}`)}
                    onDelete={() => handleDelete(machine.id)}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {filtered.length === 0 && machines.length > 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-3">Nenhuma máquina encontrada para "<span className="text-foreground">{search}</span>"</p>
            <button onClick={clearFilters} className="text-xs text-[hsl(var(--color-info))] hover:underline">Limpar filtros</button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, sub, color, featured }: {
  icon: React.ReactNode; value: number; label: string; sub: string; color: string; featured?: boolean
}) {
  const colors: Record<string, string> = {
    cyan: featured
      ? "border-[hsl(var(--color-info))/40] bg-[hsl(var(--color-info))/8] text-[hsl(var(--color-info))]"
      : "border-[hsl(var(--color-info))/20] bg-[hsl(var(--color-info))/5] text-[hsl(var(--color-info))]",
    green: "border-emerald-400/20 bg-emerald-400/5 text-emerald-400",
    blue: "border-blue-400/20 bg-blue-400/5 text-blue-400",
    purple: "border-purple-400/20 bg-purple-400/5 text-purple-400",
  };
  return (
    <div className={`border rounded-xl px-4 py-3 ${colors[color]} ${featured ? "sm:col-span-1" : ""}`}>
      <div className="flex items-center gap-2 mb-1 opacity-70">
        {icon}
        <span className="text-[10px] uppercase tracking-wider font-semibold opacity-80">{label}</span>
      </div>
      <p className={`font-bold leading-none ${featured ? "text-3xl" : "text-2xl"}`}>{value.toLocaleString("pt-BR")}</p>
      <p className="text-[10px] mt-1 opacity-60">{sub}</p>
    </div>
  );
}

function OSTick({ label, count, color, onClick, active }: {
  label: string; count: number; color: string; onClick: () => void; active: boolean
}) {
  const colors: Record<string, string> = {
    violet: active ? "border-violet-400/50 bg-violet-400/15 text-violet-300" : "border-violet-400/20 bg-violet-400/5 text-violet-400",
    blue: active ? "border-blue-400/50 bg-blue-400/15 text-blue-300" : "border-blue-400/20 bg-blue-400/5 text-blue-400",
    orange: active ? "border-orange-400/50 bg-orange-400/15 text-orange-300" : "border-orange-400/20 bg-orange-400/5 text-orange-400",
  };
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium transition-all ${colors[color]}`}
    >
      {label}
      <span className="font-bold">{count}</span>
    </button>
  );
}

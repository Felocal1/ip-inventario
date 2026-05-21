import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { loadInventories } from "@/lib/parseInventory";
import Header from "@/components/layout/Header";
import {
  ArrowLeft, Monitor, Cpu, Server, Wifi, HardDrive,
  Users, Package, Activity, Share2, Printer, ChevronDown, ChevronRight, Search
} from "lucide-react";
import type { MachineInventory, Service } from "@/types/inventario";

function SectionWrapper({ title, icon, children, defaultOpen = true }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card-surface overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[hsl(var(--color-surface-2))] transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <span className="text-[hsl(var(--color-info))]">{icon}</span>
        <span className="font-semibold text-foreground text-sm">{title}</span>
        <span className="ml-auto text-muted-foreground">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>
      </button>
      {open && <div className="px-5 pb-5 border-t border-border">{children}</div>}
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 py-2 border-b border-border/50 last:border-0">
      <span className="data-label w-44 shrink-0">{label}</span>
      <span className="data-value break-all">{value || "—"}</span>
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const cls = s === "running" ? "status-running" : s === "stopped" ? "status-stopped" : "status-unknown";
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cls}`}>
      {status}
    </span>
  );
}

function formatMB(mb: number): string {
  if (!mb) return "—";
  return mb >= 1024 ? `${(mb / 1024).toFixed(0)} GB` : `${mb} MB`;
}

function formatDiskMB(mbStr: string): string {
  const mb = parseInt(mbStr, 10);
  if (isNaN(mb)) return mbStr || "—";
  return mb >= 1024 ? `${(mb / 1024).toFixed(0)} GB` : `${mb} MB`;
}

export default function MachineDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const machines = loadInventories();
  const machine = machines.find(m => m.id === id);

  const [svcSearch, setSvcSearch] = useState("");
  const [swSearch, setSwSearch] = useState("");
  const [svcFilter, setSvcFilter] = useState<"all" | "running" | "stopped">("all");

  const filteredServices = useMemo(() => {
    return machine?.services.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(svcSearch.toLowerCase());
      const matchFilter = svcFilter === "all" || s.status.toLowerCase() === svcFilter;
      return matchSearch && matchFilter;
    }) || [];
  }, [machine?.services, svcSearch, svcFilter]);

  const filteredSoftware = useMemo(() => {
    return machine?.softwareList.filter(s =>
      s.toLowerCase().includes(swSearch.toLowerCase())
    ) || [];
  }, [machine?.softwareList, swSearch]);

  if (!machine) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">Máquina não encontrada</h2>
          <button onClick={() => navigate("/")} className="text-[hsl(var(--color-info))] hover:underline">
            Voltar ao painel
          </button>
        </div>
      </div>
    );
  }

  const runningCount = machine.services.filter(s => s.status.toLowerCase() === "running").length;
  const stoppedCount = machine.services.filter(s => s.status.toLowerCase() === "stopped").length;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Back + Title */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao painel
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[hsl(var(--color-info))/15] flex items-center justify-center">
              <Monitor className="w-7 h-7 text-[hsl(var(--color-info))]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{machine.machineName}</h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                {machine.osName} · IP {machine.primaryIP || "N/D"} · {machine.model}
              </p>
            </div>
            <div className="sm:ml-auto flex flex-wrap gap-2">
              <span className="text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-3 py-1 rounded-full text-xs font-medium">
                {runningCount} serviços ativos
              </span>
              <span className="text-red-400 bg-red-400/10 border border-red-400/20 px-3 py-1 rounded-full text-xs font-medium">
                {stoppedCount} parados
              </span>
            </div>
          </div>
        </div>

        {/* Quick summary bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <QuickStat label="RAM" value={formatMB(machine.totalMemoryMB)} icon={<Server className="w-4 h-4" />} />
          <QuickStat label="Processador" value={machine.processorSpeed} icon={<Cpu className="w-4 h-4" />} />
          <QuickStat label="Fabricante" value={machine.manufacturer} icon={<Monitor className="w-4 h-4" />} />
          <QuickStat label="Service Tag" value={machine.serviceTag} icon={<Activity className="w-4 h-4" />} />
        </div>

        {/* Sections */}
        <div className="space-y-3">
          {/* OS */}
          <SectionWrapper title="Sistema Operacional" icon={<Monitor className="w-5 h-5" />}>
            <div className="mt-3">
              <DataRow label="Sistema" value={machine.osName} />
              <DataRow label="Versão" value={machine.osVersion} />
              <DataRow label="Service Pack" value={machine.servicePack} />
              <DataRow label="Boot Device" value={machine.bootDevice} />
              <DataRow label="Diretório de instalação" value={machine.installDir} />
              <DataRow label="Usuário registrado" value={machine.registeredUser} />
              <DataRow label="Número serial" value={machine.serialNumber} />
              <DataRow label="Fuso horário" value={machine.timeZone} />
            </div>
          </SectionWrapper>

          {/* CPU + BIOS */}
          <SectionWrapper title="Processador & Hardware" icon={<Cpu className="w-5 h-5" />}>
            <div className="mt-3 grid sm:grid-cols-2 gap-6">
              <div>
                <p className="section-header mb-3">Processador</p>
                <DataRow label="Família" value={machine.processorFamily} />
                <DataRow label="Modelo" value={machine.processorName} />
                <DataRow label="Velocidade" value={machine.processorSpeed} />
              </div>
              <div>
                <p className="section-header mb-3">BIOS / Hardware</p>
                <DataRow label="Fabricante" value={machine.manufacturer} />
                <DataRow label="Modelo" value={machine.model} />
                <DataRow label="Service Tag" value={machine.serviceTag} />
                <DataRow label="Versão BIOS" value={machine.biosVersion} />
                <DataRow label="Data BIOS" value={machine.biosDate} />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <p className="section-header mb-3">Memória</p>
              <div className="flex flex-wrap gap-3">
                {machine.memorySlots.length > 0 ? machine.memorySlots.map((slot, i) => (
                  <div key={i} className={`px-4 py-3 rounded-xl border text-sm ${
                    slot.status === "Vazio" ? "border-border text-muted-foreground bg-muted/30" : "border-[hsl(var(--color-info))/30] bg-[hsl(var(--color-info))/5] text-foreground"
                  }`}>
                    <div className="font-mono text-xs text-muted-foreground">{slot.slot}</div>
                    <div className="font-bold mt-1">{slot.status === "Vazio" ? "Vazio" : formatDiskMB(slot.sizeMB)}</div>
                    {slot.type && <div className="text-xs text-muted-foreground">{slot.type}</div>}
                  </div>
                )) : (
                  <div className="px-4 py-3 rounded-xl border border-[hsl(var(--color-info))/30] bg-[hsl(var(--color-info))/5] text-foreground">
                    <div className="font-bold">{formatMB(machine.totalMemoryMB)}</div>
                    <div className="text-xs text-muted-foreground">Total RAM</div>
                  </div>
                )}
              </div>
              {machine.pageFileSizeMB && (
                <p className="text-xs text-muted-foreground mt-2">Arquivo de paginação: {machine.pageFileLocation} — {machine.pageFileSizeMB}</p>
              )}
            </div>
          </SectionWrapper>

          {/* Network */}
          <SectionWrapper title="Rede e TCP/IP" icon={<Wifi className="w-5 h-5" />}>
            <div className="mt-3 space-y-4">
              {machine.tcpConfigs.length > 0 ? (
                machine.tcpConfigs.filter(c => c.adapterName || c.ip).map((cfg, i) => (
                  <div key={i} className="bg-[hsl(var(--color-surface-2))] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-semibold text-sm text-foreground">{cfg.adapterName || `Adaptador ${i + 1}`}</p>
                      <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">{cfg.ipType || "—"}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6">
                      <DataRow label="IP" value={cfg.ip} />
                      <DataRow label="Máscara" value={cfg.mask} />
                      <DataRow label="Gateway" value={cfg.gateway} />
                      <DataRow label="DNS" value={cfg.dns.join(", ")} />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground py-4">Nenhuma configuração TCP/IP disponível</p>
              )}

              {machine.networkAdapters.length > 0 && (
                <div>
                  <p className="section-header mb-3 mt-4">Adaptadores de Rede</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 text-muted-foreground font-medium pr-4">Descrição</th>
                          <th className="text-left py-2 text-muted-foreground font-medium pr-4">MAC</th>
                          <th className="text-left py-2 text-muted-foreground font-medium pr-4">Fabricante</th>
                          <th className="text-left py-2 text-muted-foreground font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {machine.networkAdapters.map((a, i) => (
                          <tr key={i} className="border-b border-border/50">
                            <td className="py-2 pr-4 text-foreground">{a.description}</td>
                            <td className="py-2 pr-4 font-mono text-muted-foreground">{a.mac || "—"}</td>
                            <td className="py-2 pr-4 text-muted-foreground">{a.manufacturer}</td>
                            <td className="py-2">
                              <Badge status={a.status.includes("working") ? "Running" : a.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </SectionWrapper>

          {/* Disks */}
          <SectionWrapper title="Discos e Partições" icon={<HardDrive className="w-5 h-5" />}>
            <div className="mt-3 space-y-4">
              {machine.diskDetails.map((disk, i) => (
                <div key={i} className="bg-[hsl(var(--color-surface-2))] rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="font-semibold text-sm text-foreground">{disk.caption}</p>
                    <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono shrink-0">{disk.interfaceType}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 text-xs">
                    <DataRow label="Device ID" value={disk.deviceId} />
                    <DataRow label="Tamanho" value={disk.sizeMB ? formatDiskMB(disk.sizeMB) : "—"} />
                    <DataRow label="Partições" value={disk.partitions} />
                    <DataRow label="Status" value={disk.status} />
                  </div>
                </div>
              ))}

              {machine.partitions.length > 0 && (
                <div>
                  <p className="section-header mb-3">Partições</p>
                  {machine.partitions.map((p, i) => {
                    const total = parseInt(p.sizeMB, 10);
                    const free = parseInt(p.freeSpaceMB, 10);
                    const usedPct = total && free ? Math.round(((total - free) / total) * 100) : 0;
                    const isCritical = usedPct > 85;
                    return (
                      <div key={i} className="bg-[hsl(var(--color-surface-2))] rounded-xl p-4 mb-2">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="font-bold font-mono text-foreground text-sm">{p.drive}</span>
                            <span className="text-xs text-muted-foreground">{p.type}</span>
                          </div>
                          <div className="text-right text-xs">
                            <span className={isCritical ? "text-red-400" : "text-muted-foreground"}>
                              {formatDiskMB(p.freeSpaceMB)} livre de {formatDiskMB(p.sizeMB)}
                            </span>
                          </div>
                        </div>
                        <div className="bg-muted rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${isCritical ? "bg-red-400" : "bg-[hsl(var(--color-info))]"}`}
                            style={{ width: `${usedPct}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{usedPct}% utilizado</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </SectionWrapper>

          {/* Users */}
          {machine.localUsers.length > 0 && (
            <SectionWrapper title="Usuários Locais" icon={<Users className="w-5 h-5" />} defaultOpen={false}>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-muted-foreground font-medium pr-4">Login</th>
                      <th className="text-left py-2 text-muted-foreground font-medium pr-4">Status</th>
                      <th className="text-left py-2 text-muted-foreground font-medium pr-4">Grupos</th>
                      <th className="text-left py-2 text-muted-foreground font-medium">Descrição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {machine.localUsers.map((u, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-2 pr-4 font-mono text-foreground font-medium">{u.login}</td>
                        <td className="py-2 pr-4">
                          <Badge status={u.status === "Ativa" ? "Running" : "Stopped"} />
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">{u.groups || "—"}</td>
                        <td className="py-2 text-muted-foreground max-w-xs truncate">{u.description || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionWrapper>
          )}

          {/* Services */}
          <SectionWrapper title={`Serviços (${machine.services.length})`} icon={<Activity className="w-5 h-5" />} defaultOpen={false}>
            <div className="mt-3 space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Filtrar serviços..."
                    value={svcSearch}
                    onChange={e => setSvcSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[hsl(var(--color-surface-2))] border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[hsl(var(--color-info))]"
                  />
                </div>
                <div className="flex gap-1">
                  {(["all", "running", "stopped"] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setSvcFilter(f)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        svcFilter === f
                          ? "bg-[hsl(var(--color-info))] text-[hsl(var(--primary-foreground))]"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {f === "all" ? "Todos" : f === "running" ? "Ativos" : "Parados"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto rounded-xl border border-border">
                {filteredServices.map((svc, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50 last:border-0 hover:bg-[hsl(var(--color-surface-2))]">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${svc.status.toLowerCase() === "running" ? "bg-emerald-400" : "bg-red-400"}`} />
                    <span className="text-xs text-foreground flex-1 truncate">{svc.name}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:block">{svc.startup}</span>
                    <Badge status={svc.status} />
                  </div>
                ))}
                {filteredServices.length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">Nenhum serviço encontrado</div>
                )}
              </div>
            </div>
          </SectionWrapper>

          {/* Software */}
          <SectionWrapper title={`Softwares Instalados (${machine.softwareList.length})`} icon={<Package className="w-5 h-5" />} defaultOpen={false}>
            <div className="mt-3 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar software..."
                  value={swSearch}
                  onChange={e => setSwSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[hsl(var(--color-surface-2))] border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[hsl(var(--color-info))]"
                />
              </div>
              <div className="max-h-72 overflow-y-auto rounded-xl border border-border">
                {filteredSoftware.map((sw, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50 last:border-0 hover:bg-[hsl(var(--color-surface-2))]">
                    <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--color-info))/60] shrink-0" />
                    <span className="text-xs text-foreground">{sw}</span>
                  </div>
                ))}
                {filteredSoftware.length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">Nenhum software encontrado</div>
                )}
              </div>
            </div>
          </SectionWrapper>

          {/* Shares & Printers */}
          <div className="grid sm:grid-cols-2 gap-3">
            {machine.shares.length > 0 && (
              <SectionWrapper title="Compartilhamentos" icon={<Share2 className="w-5 h-5" />} defaultOpen={false}>
                <div className="mt-3 space-y-1">
                  {machine.shares.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                      <span className="font-mono text-xs font-medium text-foreground">{s.name}</span>
                      <span className="text-xs text-muted-foreground truncate">{s.path}</span>
                    </div>
                  ))}
                </div>
              </SectionWrapper>
            )}

            {machine.printerDrivers.length > 0 && (
              <SectionWrapper title="Impressoras" icon={<Printer className="w-5 h-5" />} defaultOpen={false}>
                <div className="mt-3 space-y-1">
                  {machine.printerDrivers.slice(0, 10).map((p, i) => (
                    <div key={i} className="flex items-start gap-2 py-1.5 border-b border-border/50 last:border-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
                      <span className="text-xs text-foreground">{p}</span>
                    </div>
                  ))}
                  {machine.printerPorts.length > 0 && (
                    <div className="pt-3 mt-1">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Portas TCP/IP</p>
                      {machine.printerPorts.map((p, i) => (
                        <div key={i} className="flex items-center gap-3 py-1.5">
                          <span className="font-mono text-xs text-[hsl(var(--color-info))]">{p.host}</span>
                          <span className="text-xs text-muted-foreground">:{p.protocol}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </SectionWrapper>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickStat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="card-surface p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <span className="text-[hsl(var(--color-info))]">{icon}</span>
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <p className="font-bold text-foreground text-sm truncate">{value || "—"}</p>
    </div>
  );
}

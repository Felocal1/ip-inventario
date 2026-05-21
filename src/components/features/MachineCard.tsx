import { Monitor, Server, Wifi, HardDrive, Cpu, Package, Activity, Tag } from "lucide-react";
import type { MachineInventory } from "@/types/inventario";

interface MachineCardProps {
  machine: MachineInventory;
  onClick: () => void;
  onDelete: () => void;
}

function formatMB(mb: number): string {
  if (!mb || mb === 0) return "—";
  if (mb >= 1024) return `${(mb / 1024).toFixed(0)} GB`;
  return `${mb} MB`;
}

function formatDiskMB(mbStr: string): string {
  const mb = parseInt(mbStr, 10);
  if (isNaN(mb)) return mbStr || "—";
  if (mb >= 1024) return `${(mb / 1024).toFixed(0)} GB`;
  return `${mb} MB`;
}

function getOSBadgeColor(osName: string): string {
  const os = osName.toLowerCase();
  if (os.includes("11")) return "text-violet-400 bg-violet-400/10 border-violet-400/20";
  if (os.includes("10")) return "text-blue-400 bg-blue-400/10 border-blue-400/20";
  if (os.includes("server")) return "text-orange-400 bg-orange-400/10 border-orange-400/20";
  return "text-muted-foreground bg-muted border-border";
}

function getOSShort(osName: string): string {
  const os = osName.toLowerCase();
  if (os.includes("windows 11")) return "Win 11";
  if (os.includes("windows 10")) return "Win 10";
  if (os.includes("server 2022")) return "Server 22";
  if (os.includes("server 2019")) return "Server 19";
  if (os.includes("windows")) return "Windows";
  return osName.slice(0, 8) || "—";
}

export default function MachineCard({ machine, onClick, onDelete }: MachineCardProps) {
  const uploadDate = new Date(machine.uploadDate);
  const isToday = new Date().toDateString() === uploadDate.toDateString();
  const runningServices = machine.services.filter(s => s.status.toLowerCase() === "running").length;
  const stoppedServices = machine.services.filter(s => s.status.toLowerCase() === "stopped").length;

  return (
    <div
      className="card-surface cursor-pointer hover:border-[hsl(var(--color-info))/40] transition-all duration-200 hover:glow-cyan group relative flex flex-col overflow-hidden"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === "Enter" && onClick()}
    >
      {/* Top color accent */}
      <div className="h-1 w-full bg-gradient-to-r from-[hsl(var(--color-info))/60] to-violet-500/40" />

      {/* Delete button */}
      <button
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400 text-xs z-10"
        onClick={e => { e.stopPropagation(); onDelete(); }}
        title="Remover"
      >
        ✕
      </button>

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-[hsl(var(--color-info))/12] border border-[hsl(var(--color-info))/20] flex items-center justify-center shrink-0">
            <Monitor className="w-5 h-5 text-[hsl(var(--color-info))]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-2">
              <div>
                <h3 className="font-bold text-foreground truncate text-base leading-tight">{machine.machineName}</h3>
                <p className="mt-2 text-sm font-semibold text-[hsl(var(--color-info))] truncate">
                  IP principal: {machine.primaryIP || "Não identificado"}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${getOSBadgeColor(machine.osName)}`}>
                  {getOSShort(machine.osName)}
                </span>
                {machine.manufacturer && (
                  <span className="text-[10px] text-muted-foreground">{machine.manufacturer}</span>
                )}
              </div>
            </div>
          </div>
          <span className={`shrink-0 text-[10px] px-2 py-1 rounded-lg font-medium ${isToday ? "text-emerald-400 bg-emerald-400/10 border border-emerald-400/20" : "text-muted-foreground bg-muted border border-border"}`}>
            {isToday ? "● Hoje" : uploadDate.toLocaleDateString("pt-BR")}
          </span>
        </div>

        {/* Hardware specs grid */}
        <div className="grid grid-cols-2 gap-2">
          <InfoItem icon={<Cpu className="w-3.5 h-3.5" />} label="CPU"
            value={machine.processorName?.replace(/\(R\)|\(TM\)/g, "").split(" ").slice(0, 5).join(" ") || machine.processorFamily?.split(" ").slice(0, 3).join(" ") || "—"} />
          <InfoItem icon={<Server className="w-3.5 h-3.5" />} label="RAM" value={formatMB(machine.totalMemoryMB)} />
          <InfoItem icon={<Wifi className="w-3.5 h-3.5" />} label="IP" value={machine.primaryIP || "—"} />
          <InfoItem icon={<Tag className="w-3.5 h-3.5" />} label="Service Tag" value={machine.serviceTag || machine.model || "—"} />
        </div>

        {/* Disk partitions */}
        {machine.partitions.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Armazenamento</p>
            {machine.partitions.slice(0, 3).map((p, i) => {
              const total = parseInt(p.sizeMB, 10);
              const free = parseInt(p.freeSpaceMB, 10);
              const usedPct = total && free ? Math.round(((total - free) / total) * 100) : 0;
              const isCritical = usedPct > 85;
              const isWarning = usedPct > 70 && !isCritical;
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold text-muted-foreground w-6 shrink-0">{p.drive}</span>
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        isCritical ? "bg-red-400" : isWarning ? "bg-amber-400" : "bg-[hsl(var(--color-info))]"
                      }`}
                      style={{ width: `${Math.min(usedPct, 100)}%` }}
                    />
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-[10px] font-medium ${
                      isCritical ? "text-red-400" : isWarning ? "text-amber-400" : "text-muted-foreground"
                    }`}>{usedPct}%</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground w-16 text-right shrink-0">{formatDiskMB(p.freeSpaceMB)} liv.</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer stats */}
        <div className="flex items-center gap-2 pt-3 border-t border-border mt-auto">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-xs text-emerald-400 font-medium">{runningServices}</span>
            <span className="text-[10px] text-muted-foreground">ativos</span>
          </div>
          <div className="w-px h-3 bg-border" />
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
            <span className="text-xs text-red-400 font-medium">{stoppedServices}</span>
            <span className="text-[10px] text-muted-foreground">parados</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-muted-foreground">
            <Package className="w-3 h-3" />
            <span className="text-[10px]">{machine.softwareList.length} apps</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Activity className="w-3 h-3" />
            <span className="text-[10px]">{machine.services.length} serv.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-[hsl(var(--color-surface-2))] rounded-lg p-2.5">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        <span className="text-[hsl(var(--color-info))/70]">{icon}</span>
        <span className="text-[9px] uppercase tracking-widest font-semibold">{label}</span>
      </div>
      <p className="text-xs font-semibold text-foreground truncate" title={value}>{value}</p>
    </div>
  );
}

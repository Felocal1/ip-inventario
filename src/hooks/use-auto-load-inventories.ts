import { useEffect } from "react";
import { parseInventoryHTML, loadInventories, saveInventories } from "@/lib/parseInventory";
import { toast } from "sonner";

/**
 * Hook que carrega automaticamente inventários HTML da pasta public
 * quando o localStorage está vazio (útil para primeiro acesso em produção)
 */
export function useAutoLoadInventories() {
  useEffect(() => {
    const tryAutoLoad = async () => {
      const existing = loadInventories();
      
      // Se já existem dados no localStorage, não fazer nada
      if (existing.length > 0) return;

      // Tenta carregar uma lista estática gerada em /mil-files.json
      const defaultFiles = ["MIL-CHAMMA.HTML", "MIL-AUDITORIO.HTML"];
      let filesToLoad: string[] = defaultFiles;
      try {
        const listResp = await fetch(`/mil-files.json`);
        if (listResp.ok) {
          const list = await listResp.json();
          if (Array.isArray(list) && list.length) {
            filesToLoad = list.filter((f: string) => typeof f === "string" && /^MIL-.*\.html$/i.test(f));
          }
        }
      } catch (err) {
        // fallback: manter lista default
      }

      try {
        const newMachines = [];

        for (const fileName of filesToLoad) {
          try {
            const response = await fetch(`/${fileName}`);
            if (!response.ok) continue;
            
            const content = await response.text();
            if (!content || content.length < 100) continue;

            const parsed = parseInventoryHTML(content, fileName);
            newMachines.push(parsed);
          } catch (err) {
            console.warn(`Erro ao carregar ${fileName}:`, err);
          }
        }

        if (newMachines.length > 0) {
          saveInventories(newMachines);
          toast.success(`${newMachines.length} inventário(s) carregado(s) automaticamente`);
          // Reload para refletir os dados
          window.location.reload();
        }
      } catch (err) {
        console.warn("Erro ao carregar inventários automaticamente:", err);
      }
    };

    tryAutoLoad();
  }, []);
}

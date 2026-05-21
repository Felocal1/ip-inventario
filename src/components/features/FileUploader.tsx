import { useCallback, useState } from "react";
import { Upload, FolderOpen } from "lucide-react";

interface FileUploaderProps {
  onFilesLoaded: (files: Array<{ name: string; content: string }>) => void;
}

export default function FileUploader({ onFilesLoaded }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const readFileWithEncoding = (file: File, encoding: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file, encoding);
    });
  };

  const processFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const results: Array<{ name: string; content: string }> = [];
    for (const file of Array.from(files)) {
      const nameLower = file.name.toLowerCase();
      if (nameLower.endsWith(".html") || nameLower.endsWith(".htm")) {
        // Try Windows-1252 first (VBS default), fallback to UTF-8
        let content = "";
        try {
          content = await readFileWithEncoding(file, "windows-1252");
          // Sanity check: if it looks like UTF-8 BOM or valid UTF-8, re-read
          if (content.startsWith("\uFEFF")) {
            content = await readFileWithEncoding(file, "utf-8");
          }
        } catch {
          content = await file.text();
        }
        console.log("[FileUploader] Loaded:", file.name, "size:", content.length);
        results.push({ name: file.name, content });
      }
    }
    if (results.length > 0) {
      onFilesLoaded(results);
    } else {
      console.warn("[FileUploader] No valid HTML files found in selection");
    }
  }, [onFilesLoaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    e.target.value = "";
  }, [processFiles]);

  return (
    <div
      className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200 ${
        isDragging
          ? "border-[hsl(var(--color-info))] bg-[hsl(var(--color-info))/5]"
          : "border-border hover:border-[hsl(var(--color-info))/50] hover:bg-[hsl(var(--color-surface-2))]"
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        type="file"
        accept=".html,.htm"
        multiple
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        onChange={handleFileInput}
      />

      <div className="flex flex-col items-center gap-3 pointer-events-none">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
          isDragging ? "bg-[hsl(var(--color-info))/20]" : "bg-[hsl(var(--color-surface-2))]"
        }`}>
          {isDragging ? (
            <FolderOpen className="w-8 h-8 text-[hsl(var(--color-info))]" />
          ) : (
            <Upload className="w-8 h-8 text-muted-foreground" />
          )}
        </div>
        <div>
          <p className="font-semibold text-foreground">
            {isDragging ? "Solte os arquivos aqui" : "Arraste os arquivos HTML de inventário"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            ou clique para selecionar — arquivos <code className="text-[hsl(var(--color-info))] font-mono text-xs">.html</code> gerados pelo VBS
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="px-2 py-1 rounded bg-muted">Múltiplos arquivos suportados</span>
          <span className="px-2 py-1 rounded bg-muted">\\192.168.0.10\inventario</span>
        </div>
      </div>
    </div>
  );
}

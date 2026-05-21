avatar

Inventário de TI


SELECIONO OS ARQUIVOS MAS POR QUE ELES NÃO CARREGAM?
Pensamento para os 41
O problema é quase certamente a codificação dos arquivos . O VBS gera os HTMLs em Windows-1252 (Latin), mas o file.text()lê como UTF-8 — os acentos ficam prejudicados e os padrões de análise não encontram nada. Vou corrigir isso junto com a extensão do arquivo case-insensitive e parsing mais robusto.

Editado
src/components/features/FileUploader.tsx
Agora vou fortalecer o analisador para lidar com codificação variante e variações no formato HTML:
Editado
src/lib/parseInventory.ts
Agora melhore também o feedback de erro no Index.tsxpara que o usuário veja o que aconteceu:

Editado
src/pages/Index.tsx
Corrigido: o uploader agora lê os arquivos em Windows-1252 (encoding padrão do VBS), o parser foi reescrito com busca case-insensitive e maior tolerância ao HTML gerado pelo script, e o feedback de erro agora mostra o motivo exato se algum arquivo falhar.
Correção no carregamento de arquivos — codificação Windows-1252 + analisador robusto
2026-05-19 17:16:48

Análises
Versão atual
Continue construindo

Exportar Inventário CSV

Alertas de Criticidade

Comparar

500
Atualizar
Descreva seu aplicativo web...


Editar



Pré-visualização

Nuvem

Código

Análises
Somente leitura. Para editar o código,

Faça upgrade para um plano pago.




Pré-visualização

Publicar
Pesquisar arquivos...
favicon.ico

placeholder.svg

robots.txt

FileUploader.tsx

MachineCard.tsx

vite.config.ts

comando.tsx

toast.tsx

package.json

herói-bg.jpg

Cabeçalho.tsx

acordeão.tsx

alert-dialog.tsx

alerta.tsx

proporção-de-aspecto.tsx

src/components/ui/aspect-ratio.tsx
Somente leitura
654321
import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio"

const AspectRatio = AspectRatioPrimitive.Root

export { AspectRatio }


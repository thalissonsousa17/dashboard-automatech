/**
 * Extrai texto de um PDF preservando a estrutura de linhas.
 * Agrupa items pelo eixo Y (posição vertical) para manter quebras de linha reais.
 */
export async function extractPdfTextPreserveLines(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    const version = pdfjsLib.version || '5.4.624';
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

  const allPages: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    // Agrupa itens pela posição Y arredondada (3px de tolerância para itens na mesma linha)
    const lineMap = new Map<number, string[]>();

    for (const item of content.items) {
      if (!('str' in item) || !item.str) continue;
      // transform[5] é o Y; arredondar para agrupar itens na mesma linha
      const rawY = (item as any).transform[5] as number;
      // Busca se já existe uma chave próxima (tolerância de 3px)
      let key: number | undefined;
      for (const k of lineMap.keys()) {
        if (Math.abs(k - rawY) <= 3) { key = k; break; }
      }
      if (key === undefined) { key = rawY; lineMap.set(key, []); }
      lineMap.get(key)!.push(item.str);
    }

    // Ordena do topo para baixo (Y cresce para cima em PDF, então descendente = topo primeiro)
    const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);
    const lines = sortedYs
      .map((y) => lineMap.get(y)!.join(' ').trim())
      .filter(Boolean);

    allPages.push(lines.join('\n'));
  }

  return allPages.join('\n\n');
}

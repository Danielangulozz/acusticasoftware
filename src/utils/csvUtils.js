/**
 * ==============================================================================
 * UTILIDADES DE EXPORTACIÓN E IMPORTACIÓN CSV
 * ==============================================================================
 * Convención estándar: UTF-8 con BOM (\uFEFF), separador ';' para compatibilidad
 * con Excel en español, o ',' estándar internacional, con saltos \r\n.
 */

/**
 * Descarga una matriz de filas como archivo CSV en el navegador.
 * @param {Array<Array<any>>} rows - Matriz de filas y columnas
 * @param {string} filename - Nombre del archivo a descargar
 * @param {';' | ','} sep - Separador de campos
 */
export function downloadCsv(rows, filename = 'exportacion.csv', sep = ';') {
  if (typeof window === 'undefined' || !document) return;

  const content = `sep=${sep}\r\n` + rows.map(r => 
    r.map(cell => {
      if (cell === null || cell === undefined) return '';
      const str = String(cell);
      // Si contiene el separador, comillas o salto de línea, envolver entre comillas
      if (str.includes(sep) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(sep)
  ).join('\r\n');

  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parsea un texto CSV detectando automáticamente si el separador es ';' o ',' o '\t'.
 * @param {string} csvText
 * @returns {Array<Array<string>>}
 */
export function parseCsvText(csvText) {
  if (!csvText || typeof csvText !== 'string') return [];

  // Remover BOM UTF-8 si existe
  let cleanText = csvText.replace(/^\uFEFF/, '').trim();

  // Si tiene directiva sep=X en la primera línea, usarla
  let sep = null;
  const lines = cleanText.split(/\r\n|\n|\r/);
  if (lines[0] && lines[0].toLowerCase().startsWith('sep=')) {
    sep = lines[0].substring(4).trim();
    lines.shift();
  }

  cleanText = lines.join('\n');

  if (!sep) {
    // Detección automática por frecuencia en la primera línea de datos
    const firstLine = lines.find(l => l.trim().length > 0) || '';
    const semicolons = (firstLine.match(/;/g) || []).length;
    const commas = (firstLine.match(/,/g) || []).length;
    const tabs = (firstLine.match(/\t/g) || []).length;

    if (tabs > semicolons && tabs > commas) sep = '\t';
    else if (semicolons >= commas) sep = ';';
    else sep = ',';
  }

  // Parseo línea a línea respetando comillas
  const result = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const row = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          currentCell += '"';
          i++; // saltar comilla escapada
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === sep && !inQuotes) {
        row.push(currentCell.trim());
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    row.push(currentCell.trim());
    result.push(row);
  }

  return result;
}

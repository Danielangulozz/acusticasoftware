import { toPng } from 'html-to-image';

/**
 * ==============================================================================
 * UTILIDADES DE EXPORTACIÓN GRÁFICA Y DE DATOS (POZOLE)
 * ==============================================================================
 * - Descarga de cualquier gráfico, tabla o contenedor visual como imagen PNG en alta resolución (2x Retina).
 * - Descarga de matrices de datos tabulares a Microsoft Excel (.xls con formato HTML Spreadsheet / .csv UTF-8 BOM).
 * - Exportación e importación integral de modelos de sala con geometría, materiales y posiciones electroacústicas.
 */

/**
 * Descarga un elemento DOM (gráfico Recharts, SVG, tabla, tarjeta) como imagen PNG.
 * @param {HTMLElement | string} elementOrId - Nodo DOM o ID del elemento a capturar
 * @param {string} filename - Nombre del archivo PNG generado
 * @param {object} options - Opciones de renderizado (color de fondo, padding, etc.)
 */
export async function downloadElementAsPng(elementOrId, filename = 'grafica_pozole.png', options = {}) {
  try {
    const node = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
    if (!node) {
      console.warn('downloadElementAsPng: Elemento no encontrado:', elementOrId);
      return false;
    }

    const isDark = document.documentElement.classList.contains('dark') || node.classList.contains('dark');
    const defaultBg = isDark ? '#0c0d18' : '#ffffff';

    const dataUrl = await toPng(node, {
      cacheBust: true,
      pixelRatio: options.pixelRatio || 2, // 2x para resolución de imprenta / retina
      backgroundColor: options.backgroundColor !== undefined ? options.backgroundColor : defaultBg,
      filter: (domNode) => {
        // Excluir botones de exportación dentro de la misma captura
        if (domNode?.classList?.contains('no-export')) return false;
        return true;
      },
      ...options,
    });

    const link = document.createElement('a');
    link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (err) {
    console.error('Error al exportar a PNG con html-to-image:', err);

    // Fallback directo si el nodo contiene un <svg>
    try {
      const node = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
      const svg = node?.tagName?.toLowerCase() === 'svg' ? node : node?.querySelector('svg');
      if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const URL = window.URL || window.webkitURL || window;
        const blobURL = URL.createObjectURL(svgBlob);
        
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = (svg.clientWidth || 800) * 2;
          canvas.height = (svg.clientHeight || 500) * 2;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(blobURL);
          
          const pngUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
          link.href = pngUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        };
        img.src = blobURL;
        return true;
      }
    } catch (fallbackErr) {
      console.error('Error en fallback SVG a PNG:', fallbackErr);
    }
    return false;
  }
}

/**
 * Descarga una tabla o matriz de datos como archivo de Microsoft Excel (.xls con formato Spreadsheet).
 * Se abre directamente en Excel, Google Sheets y LibreOffice sin problemas de delimitadores o tildes.
 *
 * @param {Array<string>} headers - Títulos de las columnas
 * @param {Array<Array<any>>} rows - Filas de datos
 * @param {string} filename - Nombre del archivo .xls generado
 * @param {string} sheetName - Nombre de la hoja de cálculo
 */
export function downloadTableAsExcel(headers = [], rows = [], filename = 'datos_pozole.xls', sheetName = 'Datos Acústicos') {
  if (typeof window === 'undefined') return;

  const cleanFilename = filename.endsWith('.xls') || filename.endsWith('.xlsx')
    ? filename.replace(/\.xlsx$/, '.xls')
    : `${filename}.xls`;

  // Construir tabla HTML con estilos XML reconocidos nativamente por Microsoft Excel
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" 
          xmlns:x="urn:schemas-microsoft-com:office:excel" 
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>${escapeHtml(sheetName)}</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
    <style>
        body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #1e293b; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th { 
          background-color: #5833C7; 
          color: #FFFFFF; 
          font-weight: bold; 
          border: 1px solid #4324A3; 
          padding: 8px 12px; 
          text-align: center;
          font-size: 10pt;
        }
        td { 
          border: 1px solid #E2E8F0; 
          padding: 6px 10px; 
          mso-number-format: "\\@";
          font-size: 10pt;
        }
        .section-header {
          background-color: #F1EDFD;
          color: #4324A3;
          font-weight: bold;
          font-size: 11pt;
          border: 1px solid #C4B5FD;
          padding: 10px 12px;
        }
        .main-title {
          background-color: #2E1065;
          color: #FFFFFF;
          font-weight: bold;
          font-size: 13pt;
          border: 1px solid #1E0847;
          padding: 12px;
          text-align: left;
        }
        .num { text-align: right; }
        .text { text-align: left; }
        .center { text-align: center; }
        tr:nth-child(even) td:not(.section-header):not(.main-title) { background-color: #F8FAFC; }
      </style>
    </head>
    <body>
      <table>
        ${headers && headers.length > 0 ? `
        <thead>
          <tr>
            ${headers.map(h => `<th>${escapeHtml(String(h ?? ''))}</th>`).join('')}
          </tr>
        </thead>
        ` : ''}
        <tbody>
          ${rows.map((row, rIdx) => {
            if (!row || row.length === 0) {
              return `<tr><td style="border:none; height:12px;"></td></tr>`;
            }
            if (row.length === 1 && typeof row[0] === 'string') {
              const text = row[0];
              const isMain = rIdx === 0 || text.includes('POZOLE');
              const cls = isMain ? 'main-title' : 'section-header';
              return `<tr><td colspan="15" class="${cls}">${escapeHtml(text)}</td></tr>`;
            }
            return `
              <tr>
                ${row.map(cell => {
                  const val = cell !== null && cell !== undefined ? String(cell) : '';
                  const isNumeric = typeof cell === 'number' || (!isNaN(Number(val)) && val.trim() !== '' && !val.includes(':') && !val.includes('-'));
                  return `<td class="${isNumeric ? 'num' : 'text'}">${escapeHtml(val)}</td>`;
                }).join('')}
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = cleanFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Descarga una matriz de datos en formato CSV compatible con Excel en español (separador ';' y UTF-8 BOM).
 */
export function downloadTableAsCsv(headers = [], rows = [], filename = 'datos_pozole.csv', sep = ';') {
  if (typeof window === 'undefined') return;

  const cleanFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  const allRows = headers.length > 0 ? [headers, ...rows] : rows;

  const content = `sep=${sep}\r\n` + allRows.map(row =>
    row.map(cell => {
      if (cell === null || cell === undefined) return '';
      const str = String(cell);
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
  link.download = cleanFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Escapa caracteres HTML para inyección segura en XML de Excel */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

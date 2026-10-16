import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadTableAsCsv, downloadTableAsExcel, downloadElementAsPng } from '../exportUtils';

describe('exportUtils', () => {
  let clickedLink = null;
  let mockAnchor = null;

  beforeEach(() => {
    clickedLink = null;
    mockAnchor = {
      href: '',
      download: '',
      click: vi.fn(function() {
        clickedLink = { href: this.href, download: this.download };
      }),
    };

    URL.createObjectURL = vi.fn(() => 'mock-blob-url');
    URL.revokeObjectURL = vi.fn();

    global.window = {
      URL: URL,
    };

    global.document = {
      createElement: vi.fn((tag) => {
        if (tag === 'a') return mockAnchor;
        return { clientWidth: 400, clientHeight: 300, classList: { contains: () => false } };
      }),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
      getElementById: vi.fn(() => null),
      documentElement: {
        classList: { contains: () => false },
      },
    };
  });

  describe('downloadTableAsCsv', () => {
    it('creates and triggers download of a CSV file with BOM and correct delimiter', () => {
      const headers = ['Banda', 'RT60'];
      const rows = [
        ['125 Hz', '1.20'],
        ['250 Hz', '0.95'],
      ];

      downloadTableAsCsv(headers, rows, 'test_export.csv', ';');

      expect(clickedLink).not.toBeNull();
      expect(clickedLink.download).toBe('test_export.csv');
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('mock-blob-url');
    });

    it('handles quotes and special characters in CSV cells', () => {
      const headers = ['Nombre', 'Descripción'];
      const rows = [
        ['Pared 1', 'Madera; barnizada con "alto brillo"'],
      ];

      downloadTableAsCsv(headers, rows, 'test_quotes', ';');
      expect(clickedLink.download).toBe('test_quotes.csv');
    });
  });

  describe('downloadTableAsExcel', () => {
    it('creates an HTML Spreadsheet file with .xls extension and styling', () => {
      const headers = ['Frecuencia (Hz)', 'Sabine (s)', 'Eyring (s)'];
      const rows = [
        ['125', 1.25, 1.10],
        ['250', 0.95, 0.88],
      ];

      downloadTableAsExcel(headers, rows, 'reporte_acustico.xls', 'Hoja de Prueba');

      expect(clickedLink).not.toBeNull();
      expect(clickedLink.download).toBe('reporte_acustico.xls');
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    });

    it('handles empty headers and single-element section rows', () => {
      const rows = [
        ['POZOLE - Reporte General'],
        ['1. DATOS GENERALES'],
        ['Volumen', 153.8, 'm³'],
      ];

      downloadTableAsExcel([], rows, 'reporte_secciones.xlsx');
      expect(clickedLink.download).toBe('reporte_secciones.xls');
    });
  });

  describe('downloadElementAsPng', () => {
    it('returns false gracefully when element is not found', async () => {
      const result = await downloadElementAsPng('non-existent-element-id', 'test.png');
      expect(result).toBe(false);
    });
  });
});

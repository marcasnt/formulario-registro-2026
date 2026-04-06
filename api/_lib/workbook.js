import ExcelJS from 'exceljs';
import fs from 'node:fs/promises';
import path from 'node:path';

const CM_TO_PX = 37.7952755906; // 96dpi approx
const cmToPx = (cm) => Math.round(cm * CM_TO_PX);

function buildSafeFileName(name) {
  return String(name || 'Atleta')
    .trim()
    .replace(/[^\w\s.-]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 80);
}

function addFieldRows(ws, title, rows, startRow) {
  ws.getRow(startRow).values = [title];
  ws.getRow(startRow).font = { bold: true, size: 14, color: { argb: 'FF1F2937' } };
  let r = startRow + 2;
  for (const [label, value] of rows) {
    // Con el layout, la tabla vive en columnas B (Etiqueta) y C (Valor)
    ws.getRow(r).values = ['', label, value ?? ''];
    ws.getCell(`B${r}`).font = { bold: true, color: { argb: 'FF111827' } };
    r += 1;
  }
  return r + 1;
}

async function readLogoFromEnv(wb) {
  const LOGO_URL = process.env.LOGO_URL || '';
  const LOGO_PATH = process.env.LOGO_PATH || '';
  if (!LOGO_URL && !LOGO_PATH) return null;

  try {
    let buffer;
    let extension;

    if (LOGO_PATH) {
      const abs = path.isAbsolute(LOGO_PATH) ? LOGO_PATH : path.resolve(process.cwd(), LOGO_PATH);
      const ext = path.extname(abs).toLowerCase();
      if (ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg') return null;
      buffer = await fs.readFile(abs);
      extension = ext === '.png' ? 'png' : 'jpeg';
    } else {
      const r = await fetch(LOGO_URL);
      if (!r.ok) return null;
      const ct = (r.headers.get('content-type') || '').toLowerCase();
      const isPng = ct.includes('image/png');
      const isJpg = ct.includes('image/jpeg') || ct.includes('image/jpg');
      if (!isPng && !isJpg) return null;
      const ab = await r.arrayBuffer();
      buffer = Buffer.from(ab);
      extension = isPng ? 'png' : 'jpeg';
    }

    return wb.addImage({ buffer, extension });
  } catch {
    return null;
  }
}

export async function buildWorkbook({ fields, files }) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Inscripción Atleta');

  ws.properties.defaultRowHeight = 18;
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 3 }];
  ws.pageSetup = {
    orientation: 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.2, footer: 0.2 },
  };

  // Columnas (A para logo, B/C tabla, D..H ancho fijo 5.43)
  ws.columns = [
    { key: 'logoPad', width: 14 }, // A
    { key: 'label', width: 34 }, // B
    { key: 'value', width: 50 }, // C
    { key: 'padD', width: 5.43 }, // D
    { key: 'padE', width: 5.43 }, // E
    { key: 'padF', width: 5.43 }, // F
    { key: 'padG', width: 5.43 }, // G
    { key: 'padH', width: 5.43 }, // H
  ];

  const COLORS = {
    green700: 'FF047857',
    amber400: 'FFFBBF24',
    gray50: 'FFF9FAFB',
    gray200: 'FFE5E7EB',
    gray300: 'FFD1D5DB',
    white: 'FFFFFFFF',
  };

  const borderThin = {
    top: { style: 'thin', color: { argb: COLORS.gray300 } },
    left: { style: 'thin', color: { argb: COLORS.gray300 } },
    bottom: { style: 'thin', color: { argb: COLORS.gray300 } },
    right: { style: 'thin', color: { argb: COLORS.gray300 } },
  };

  const styleLabel = (cell) => {
    cell.font = { bold: true, color: { argb: 'FF111827' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.gray50 } };
    cell.border = borderThin;
    cell.alignment = { vertical: 'middle', wrapText: true };
  };

  const styleValue = (cell) => {
    cell.font = { color: { argb: 'FF111827' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.white } };
    cell.border = borderThin;
    cell.alignment = { vertical: 'middle', wrapText: true };
  };

  const styleSectionHeader = (rowNumber, fillArgb) => {
    ws.mergeCells(`A${rowNumber}:H${rowNumber}`);
    const cell = ws.getCell(`A${rowNumber}`);
    cell.value = cell.value || '';
    cell.font = { bold: true, size: 12, color: { argb: 'FF111827' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillArgb } };
    cell.border = borderThin;
    cell.alignment = { vertical: 'middle' };
    ws.getRow(rowNumber).height = 22;
  };

  const styleTitleBar = (rowNumber) => {
    ws.mergeCells(`A${rowNumber}:H${rowNumber}`);
    const cell = ws.getCell(`A${rowNumber}`);
    cell.font = { bold: true, size: 16, color: { argb: COLORS.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.green700 } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(rowNumber).height = 30;
  };

  const styleSubTitleBar = (rowNumber) => {
    ws.mergeCells(`A${rowNumber}:H${rowNumber}`);
    const cell = ws.getCell(`A${rowNumber}`);
    cell.font = { bold: true, size: 12, color: { argb: 'FF111827' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.amber400 } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = borderThin;
    ws.getRow(rowNumber).height = 22;
  };

  // Header (3 filas) con tamaños exactos
  ws.getCell('A1').value = 'FENIFISC';
  styleTitleBar(1);
  ws.getRow(1).height = 34;
  ws.getCell('A1').font = { bold: true, size: 20, color: { argb: COLORS.white } };
  ws.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };

  ws.getCell('A2').value = 'FEDERACIÓN NICARAGÜENSE DE FISICO CULTURISMO';
  styleTitleBar(2);
  ws.getRow(2).height = 56.25;
  ws.getCell('A2').font = { bold: true, size: 18, color: { argb: COLORS.white } };
  ws.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };

  ws.getCell('A3').value = 'FORMULARIO DE INSCRIPCION DE ATLETAS';
  styleSubTitleBar(3);
  ws.getCell('A3').font = { bold: true, size: 14, color: { argb: 'FF111827' } };
  ws.getCell('A3').alignment = { vertical: 'middle', horizontal: 'center' };

  // Logos (izq/der) con tamaño exacto
  const logoImgId = await readLogoFromEnv(wb);
  if (logoImgId) {
    const logoW = cmToPx(2.99);
    const logoH = cmToPx(2.69);
    ws.addImage(logoImgId, { tl: { col: 0.05, row: 0.05 }, ext: { width: logoW, height: logoH }, editAs: 'oneCell' });
    ws.addImage(logoImgId, { tl: { col: 7.05, row: 0.05 }, ext: { width: logoW, height: logoH }, editAs: 'oneCell' });
  }

  let row = 5;
  ws.getCell(`A${row}`).value = 'DATOS GENERALES DEL ATLETA';
  styleSectionHeader(row, COLORS.amber400);
  row += 1;

  row = addFieldRows(ws, '', [
    ['Federación:', fields.federacion],
    ['Nombres y Apellidos:', fields.nombresApellidos],
    ['Fecha de nacimiento:', fields.fechaNacimiento],
    ['Edad:', fields.edad],
    ['Género:', fields.genero],
    ['Nacionalidad:', fields.nacionalidad],
    ['Número de identificación:', fields.identificacion],
    ['Lugar de Nacimiento:', fields.lugarNacimiento],
    ['Municipio:', fields.municipio],
    ['Estado Civil:', fields.estadoCivil],
    ['Dirección:', fields.direccion],
    ['Estudia Actualmente:', fields.estudiaActualmente],
    ['Teléfono del atleta:', fields.telefono],
    ['Correo electrónico:', fields.correo],
  ], row);

  ws.getCell(`A${row}`).value = 'INFORMACIÓN DEPORTIVA';
  styleSectionHeader(row, 'FFD1FAE5');
  row += 1;

  row = addFieldRows(ws, '', [
    ['Disciplina Deportiva:', fields.disciplina],
    ['Equipo o club:', fields.equipoClub],
    ['Categoría:', fields.categoria],
    ['Peso:', fields.peso],
    ['Selección:', fields.seleccion],
    ['Ha participado en Eventos Internacionales:', fields.eventosInternacionales],
    ['Años de inicio:', fields.anosInicio],
    ['Nombre del Entrenador:', fields.entrenador],
    ['Registro / Marcas destacadas:', fields.marcasDestacadas],
  ], row);

  ws.getCell(`A${row}`).value = 'INFORMACIÓN DE CONTACTO EN CASO DE EMERGENCIA';
  styleSectionHeader(row, COLORS.amber400);
  row += 1;

  row = addFieldRows(ws, '', [
    ['Nombre del contacto:', fields.nombreContacto],
    ['Parentesco:', fields.parentesco],
    ['Teléfono:', fields.telefonoContacto],
  ], row);

  const idFront = files?.idFront;
  const idBack = files?.idBack;

  if (idFront || idBack) {
    ws.getCell(`A${row}`).value = 'DOCUMENTOS (CÉDULA DE IDENTIDAD)';
    styleSectionHeader(row, COLORS.gray200);
    row += 2;

    const addDocImage = (file, label) => {
      if (!file) return;
      const mimetype = (file.mimetype || '').toLowerCase();
      const ext = mimetype === 'image/png' ? 'png' : (mimetype === 'image/jpeg' || mimetype === 'image/jpg') ? 'jpeg' : null;
      if (!ext) throw new Error(`Formato de imagen no soportado para "${label}". Usa JPG o PNG (recibido: ${file.mimetype || 'desconocido'}).`);

      const imgId = wb.addImage({ buffer: file.buffer, extension: ext });

      ws.getCell(`B${row}`).value = label;
      styleLabel(ws.getCell(`B${row}`));
      styleValue(ws.getCell(`C${row}`));

      for (let i = 0; i < 8; i += 1) {
        ws.getRow(row + i).height = 22;
        styleValue(ws.getCell(`C${row + i}`));
      }

      ws.addImage(imgId, {
        tl: { col: 2.05, row: row - 1 + 0.15 },
        ext: { width: cmToPx(11.56), height: cmToPx(6.05) },
        editAs: 'oneCell',
      });

      row += 10;
    };

    addDocImage(idFront, 'Cédula - Frente');
    addDocImage(idBack, 'Cédula - Reverso');
  }

  // Estilos de tabla en B/C
  for (let r = 5; r <= row; r += 1) {
    if (ws.getCell(`A${r}`).isMerged) continue;
    const a = ws.getCell(`B${r}`);
    const b = ws.getCell(`C${r}`);
    const isSectionLike =
      typeof a.value === 'string' &&
      (a.value.includes('INFORMACIÓN') || a.value.includes('DATOS') || a.value.includes('DOCUMENTOS'));
    if (isSectionLike) continue;
    if (a.value || b.value) {
      styleLabel(a);
      styleValue(b);
    }
  }

  ws.getColumn(2).alignment = { vertical: 'middle', wrapText: true };
  ws.getColumn(3).alignment = { vertical: 'middle', wrapText: true };

  const footerRow = row + 1;
  ws.getCell(`A${footerRow}`).value = '© 2026 FENIFISC - Todos los derechos reservados';
  ws.mergeCells(`A${footerRow}:H${footerRow}`);
  const f = ws.getCell(`A${footerRow}`);
  f.font = { bold: true, size: 10, color: { argb: COLORS.white } };
  f.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.green700 } };
  f.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(footerRow).height = 20;

  return { workbook: wb, fileNameBase: buildSafeFileName(fields.nombresApellidos) };
}


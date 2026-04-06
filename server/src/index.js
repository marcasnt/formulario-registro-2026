import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import multer from 'multer';
import ExcelJS from 'exceljs';
import nodemailer from 'nodemailer';
import fs from 'node:fs/promises';
import path from 'node:path';

const app = express();

const PORT = Number(process.env.PORT || 8787);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5174';
const DEST_EMAIL = process.env.DEST_EMAIL || 'marcasnt@gmail.com';
const LOGO_URL = process.env.LOGO_URL || '';
const LOGO_PATH = process.env.LOGO_PATH || '';

// CORS: en desarrollo Vite puede cambiar de puerto (5173/5174/5175...).
// Permitimos cualquier localhost para evitar "Failed to fetch" por CORS.
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      try {
        const u = new URL(origin);
        if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return cb(null, true);
      } catch {
        // ignore
      }
      return cb(null, origin === CLIENT_ORIGIN);
    },
    methods: ['POST', 'GET', 'OPTIONS'],
  })
);

// Subida en memoria (no guardamos en disco)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB por archivo
});

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Falta variable de entorno: ${name}`);
  return v;
}

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
    // Con el layout nuevo, la tabla vive en columnas B (Etiqueta) y C (Valor)
    ws.getRow(r).values = ['', label, value ?? ''];
    ws.getCell(`B${r}`).font = { bold: true, color: { argb: 'FF111827' } };
    r += 1;
  }
  return r + 1;
}

async function buildWorkbook({ fields, files }) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Inscripción Atleta');

  const CM_TO_PX = 37.7952755906; // 96dpi approx
  const cmToPx = (cm) => Math.round(cm * CM_TO_PX);

  // Configuración general de hoja (parecido al formulario web)
  ws.properties.defaultRowHeight = 18;
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 3 }];
  ws.pageSetup = {
    orientation: 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.2, footer: 0.2 },
  };

  // Columnas (reservamos una zona a la izquierda para el logo)
  ws.columns = [
    { key: 'logoPad', width: 14 },  // A
    { key: 'label', width: 34 },    // B
    { key: 'value', width: 50 },    // C
    // D..H deben quedar como en tu plantilla (ancho 5.43)
    { key: 'padD', width: 5.43 },   // D
    { key: 'padE', width: 5.43 },   // E
    { key: 'padF', width: 5.43 },   // F
    { key: 'padG', width: 5.43 },   // G
    { key: 'padH', width: 5.43 },   // H
  ];

  const COLORS = {
    green700: 'FF047857', // emerald-ish
    green600: 'FF059669',
    amber400: 'FFFBBF24',
    amber500: 'FFF59E0B',
    gray50: 'FFF9FAFB',
    gray200: 'FFE5E7EB',
    gray300: 'FFD1D5DB',
    gray700: 'FF374151',
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

  const tryAddLogo = async () => {
    if (!LOGO_URL && !LOGO_PATH) return;
    try {
      let buffer;
      let extension;

      if (LOGO_PATH) {
        const abs = path.isAbsolute(LOGO_PATH) ? LOGO_PATH : path.resolve(process.cwd(), LOGO_PATH);
        const ext = path.extname(abs).toLowerCase();
        if (ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg') return;
        buffer = await fs.readFile(abs);
        extension = ext === '.png' ? 'png' : 'jpeg';
      } else {
        const r = await fetch(LOGO_URL);
        if (!r.ok) return;
        const ct = (r.headers.get('content-type') || '').toLowerCase();
        const isPng = ct.includes('image/png');
        const isJpg = ct.includes('image/jpeg') || ct.includes('image/jpg');
        if (!isPng && !isJpg) return;
        const ab = await r.arrayBuffer();
        buffer = Buffer.from(ab);
        extension = isPng ? 'png' : 'jpeg';
      }
      const imgId = wb.addImage({
        buffer,
        extension,
      });
      // Logos con tamaño exacto (2.99cm x 2.69cm), integrados en el header
      const logoW = cmToPx(2.99);
      const logoH = cmToPx(2.69);
      ws.addImage(imgId, {
        tl: { col: 0.05, row: 0.05 }, // cerca de A1
        ext: { width: logoW, height: logoH },
        editAs: 'oneCell',
      });
      ws.addImage(imgId, {
        tl: { col: 7.05, row: 0.05 }, // cerca de H1
        ext: { width: logoW, height: logoH },
        editAs: 'oneCell',
      });
    } catch {
      // Si falla, omitimos el logo (no bloquea el Excel).
    }
  };

  // Encabezados
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

  await tryAddLogo();

  let row = 5;
  ws.getCell(`A${row}`).value = 'DATOS GENERALES DEL ATLETA';
  styleSectionHeader(row, COLORS.amber400);
  row += 1;

  row = addFieldRows(
    ws,
    '',
    [
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
    ],
    row
  );

  ws.getCell(`A${row}`).value = 'INFORMACIÓN DEPORTIVA';
  styleSectionHeader(row, 'FFD1FAE5'); // green-100 feel
  row += 1;

  row = addFieldRows(
    ws,
    '',
    [
      ['Disciplina Deportiva:', fields.disciplina],
      ['Equipo o club:', fields.equipoClub],
      ['Categoría:', fields.categoria],
      ['Peso:', fields.peso],
      ['Selección:', fields.seleccion],
      ['Ha participado en Eventos Internacionales:', fields.eventosInternacionales],
      ['Años de inicio:', fields.anosInicio],
      ['Nombre del Entrenador:', fields.entrenador],
      ['Registro / Marcas destacadas:', fields.marcasDestacadas],
    ],
    row
  );

  ws.getCell(`A${row}`).value = 'INFORMACIÓN DE CONTACTO EN CASO DE EMERGENCIA';
  styleSectionHeader(row, COLORS.amber400);
  row += 1;

  row = addFieldRows(
    ws,
    '',
    [
      ['Nombre del contacto:', fields.nombreContacto],
      ['Parentesco:', fields.parentesco],
      ['Teléfono:', fields.telefonoContacto],
    ],
    row
  );

  // Imágenes: las incrustamos debajo, si existen.
  const idFront = files?.idFront?.[0];
  const idBack = files?.idBack?.[0];

  if (idFront || idBack) {
    ws.getCell(`A${row}`).value = 'DOCUMENTOS (CÉDULA DE IDENTIDAD)';
    styleSectionHeader(row, COLORS.gray200);
    row += 2;

    const addImage = (file, label) => {
      if (!file) return;
      const ext =
        file.mimetype === 'image/png'
          ? 'png'
          : file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg'
            ? 'jpeg'
            : null;
      if (!ext) {
        throw new Error(
          `Formato de imagen no soportado para "${label}". Usa JPG o PNG (recibido: ${file.mimetype || 'desconocido'}).`
        );
      }
      const imgId = wb.addImage({ buffer: file.buffer, extension: ext });
      ws.getCell(`A${row}`).value = label;
      styleLabel(ws.getCell(`B${row}`));
      styleValue(ws.getCell(`C${row}`));
      // Marco y tamaño exacto para cédula: 11.56cm x 6.05cm
      for (let i = 0; i < 8; i += 1) {
        ws.getRow(row + i).height = 22;
        styleValue(ws.getCell(`C${row + i}`));
      }
      ws.addImage(imgId, {
        tl: { col: 2.05, row: row - 1 + 0.15 }, // columna C (0=A,1=B,2=C)
        ext: { width: cmToPx(11.56), height: cmToPx(6.05) },
        editAs: 'oneCell',
      });
      row += 10; // dejar espacio
    };

    addImage(idFront, 'Cédula - Frente');
    addImage(idBack, 'Cédula - Reverso');
  }

  // Aplicar estilos de tabla a filas de campos (A/B) donde existan valores
  for (let r = 5; r <= row; r += 1) {
    const a = ws.getCell(`B${r}`); // etiqueta
    const b = ws.getCell(`C${r}`); // valor
    // Saltar filas vacías o encabezados ya formateados (celdas combinadas)
    if (ws.getCell(`A${r}`).isMerged) continue;
    const isSectionLike =
      typeof a.value === 'string' &&
      (a.value.includes('INFORMACIÓN') || a.value.includes('DATOS') || a.value.includes('DOCUMENTOS'));
    if (isSectionLike) continue;
    if (a.value || b.value) {
      styleLabel(a);
      styleValue(b);
    }
  }

  // Un poco de “aire” visual
  ws.getColumn(2).alignment = { vertical: 'middle', wrapText: true };
  ws.getColumn(3).alignment = { vertical: 'middle', wrapText: true };

  // Footer tipo barra (parecido al sitio)
  const footerRow = row + 1;
  ws.getCell(`A${footerRow}`).value = '© 2026 FENIFISC - Todos los derechos reservados';
  ws.mergeCells(`A${footerRow}:H${footerRow}`);
  const f = ws.getCell(`A${footerRow}`);
  f.font = { bold: true, size: 10, color: { argb: COLORS.white } };
  f.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.green700 } };
  f.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(footerRow).height = 20;

  return wb;
}

async function sendEmail({ subject, text, attachments }) {
  const host = requireEnv('SMTP_HOST');
  const port = Number(requireEnv('SMTP_PORT'));
  const secure = String(requireEnv('SMTP_SECURE')).toLowerCase() === 'true';
  const user = requireEnv('SMTP_USER');
  const pass = requireEnv('SMTP_PASS');

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: user,
    to: DEST_EMAIL,
    subject,
    text,
    attachments,
  });
}

function safeHeaderValue(s) {
  return String(s || '')
    .replace(/[\r\n]+/g, ' ')
    .slice(0, 180);
}

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post(
  '/api/excel',
  upload.fields([
    { name: 'idFront', maxCount: 1 },
    { name: 'idBack', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const fields = req.body || {};
      const files = req.files || {};

      const wb = await buildWorkbook({ fields, files });
      const buffer = await wb.xlsx.writeBuffer();

      const safeName = buildSafeFileName(fields.nombresApellidos);
      const date = new Date().toISOString().split('T')[0];
      const xlsxName = `Inscripcion_${safeName}_${date}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${xlsxName}"`);
      res.send(Buffer.from(buffer));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      res.status(500).json({ ok: false, error: message });
    }
  }
);

app.post(
  '/api/submit',
  upload.fields([
    { name: 'idFront', maxCount: 1 },
    { name: 'idBack', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const fields = req.body || {};
      const files = req.files || {};

      const wb = await buildWorkbook({ fields, files });
      const buffer = await wb.xlsx.writeBuffer();

      const safeName = buildSafeFileName(fields.nombresApellidos);
      const date = new Date().toISOString().split('T')[0];
      const xlsxName = `Inscripcion_${safeName}_${date}.xlsx`;

      const attachments = [
        { filename: xlsxName, content: Buffer.from(buffer) },
      ];

      const idFront = files?.idFront?.[0];
      const idBack = files?.idBack?.[0];
      if (idFront) attachments.push({ filename: idFront.originalname, content: idFront.buffer });
      if (idBack) attachments.push({ filename: idBack.originalname, content: idBack.buffer });

      let emailStatus = 'ok';
      let emailError = '';
      try {
        await sendEmail({
          subject: `Inscripción FENIFISC - ${fields.nombresApellidos || 'Atleta'}`,
          text: 'Se adjunta Excel con datos y documentos, y las imágenes por separado.',
          attachments,
        });
      } catch (e) {
        emailStatus = 'failed';
        emailError = e instanceof Error ? e.message : 'Error desconocido enviando correo';
        // eslint-disable-next-line no-console
        console.error('Email failed:', emailError);
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${xlsxName}"`);
      res.setHeader('X-Email-Status', emailStatus);
      if (emailStatus !== 'ok') res.setHeader('X-Email-Error', safeHeaderValue(emailError));
      res.send(Buffer.from(buffer));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      res.status(500).json({ ok: false, error: message });
    }
  }
);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${PORT}`);
});


import { buildWorkbook } from './_lib/workbook.js';
import { parseMultipart } from './_lib/multipart.js';
import { getRequestOrigin } from './_lib/origin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    res.end('Method Not Allowed');
    return;
  }

  try {
    const { fields, files } = await parseMultipart(req);
    const requestOrigin = getRequestOrigin(req);
    const { workbook, fileNameBase } = await buildWorkbook({
      fields,
      files: { idFront: files.idFront, idBack: files.idBack },
      requestOrigin,
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const date = new Date().toISOString().split('T')[0];
    const xlsxName = `Inscripcion_${fileNameBase}_${date}.xlsx`;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${xlsxName}"`);
    res.end(Buffer.from(buffer));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error desconocido';
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: message }));
  }
}


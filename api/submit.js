import nodemailer from 'nodemailer';
import { buildWorkbook } from './_lib/workbook.js';
import { parseMultipart } from './_lib/multipart.js';

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Falta variable de entorno: ${name}`);
  return v;
}

function safeHeaderValue(s) {
  return String(s || '')
    .replace(/[\r\n]+/g, ' ')
    .slice(0, 180);
}

async function sendEmail({ subject, text, attachments }) {
  const host = requireEnv('SMTP_HOST');
  const port = Number(requireEnv('SMTP_PORT'));
  const secure = String(requireEnv('SMTP_SECURE')).toLowerCase() === 'true';
  const user = requireEnv('SMTP_USER');
  const pass = requireEnv('SMTP_PASS');
  const to = process.env.DEST_EMAIL || user;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: user,
    to,
    subject,
    text,
    attachments,
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    res.end('Method Not Allowed');
    return;
  }

  try {
    const { fields, files } = await parseMultipart(req);

    const { workbook, fileNameBase } = await buildWorkbook({
      fields,
      files: { idFront: files.idFront, idBack: files.idBack },
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const date = new Date().toISOString().split('T')[0];
    const xlsxName = `Inscripcion_${fileNameBase}_${date}.xlsx`;

    const attachments = [{ filename: xlsxName, content: Buffer.from(buffer) }];
    if (files.idFront) attachments.push({ filename: files.idFront.originalname, content: files.idFront.buffer });
    if (files.idBack) attachments.push({ filename: files.idBack.originalname, content: files.idBack.buffer });

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
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${xlsxName}"`);
    res.setHeader('X-Email-Status', emailStatus);
    if (emailStatus !== 'ok') res.setHeader('X-Email-Error', safeHeaderValue(emailError));
    res.end(Buffer.from(buffer));
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error desconocido';
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: message }));
  }
}


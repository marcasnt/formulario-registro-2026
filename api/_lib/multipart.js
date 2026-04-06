import Busboy from 'busboy';

export function parseMultipart(req, { maxFileSizeBytes = 8 * 1024 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    const bb = Busboy({
      headers: req.headers,
      limits: { fileSize: maxFileSizeBytes },
    });

    const fields = {};
    const files = {};

    bb.on('field', (name, val) => {
      fields[name] = val;
    });

    bb.on('file', (name, stream, info) => {
      const { filename, mimeType } = info;
      const chunks = [];

      stream.on('data', (d) => chunks.push(d));
      stream.on('limit', () => {
        stream.resume();
        reject(new Error(`Archivo "${filename}" demasiado grande. Reduce el tamaño e intenta de nuevo.`));
      });
      stream.on('end', () => {
        const buffer = Buffer.concat(chunks);
        if (buffer.length === 0) return;
        // Solo tomamos los nombres esperados
        if (name === 'idFront' || name === 'idBack') {
          files[name] = { originalname: filename, mimetype: mimeType, buffer };
        }
      });
    });

    bb.on('error', reject);
    bb.on('finish', () => resolve({ fields, files }));

    req.pipe(bb);
  });
}


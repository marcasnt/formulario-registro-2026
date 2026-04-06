# Formulario de Inscripción FENIFISC (2026)

Aplicación web para **registrar atletas** mediante un formulario y generar un **archivo Excel (.xlsx) formateado** con:

- Datos del atleta (datos generales, información deportiva, contacto de emergencia)
- **Imágenes de cédula de identidad** (frente y reverso) **incrustadas** dentro del Excel
- Encabezado con **logo** (opcional) y estilos tipo formulario

Además, al **Enviar Inscripción** se puede **enviar el Excel por correo** con las imágenes adjuntas por separado.

## Tecnologías

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend (producción)**: Vercel Serverless Functions (`api/`)
  - `exceljs`, `busboy`, `nodemailer`
- **Backend (opcional local)**: carpeta `server/` con Express (desarrollo legacy)

## Estructura del proyecto

- `src/`: aplicación React (formulario)
- `api/`: funciones para Vercel (genera Excel y envía correo)
- `public/`: archivos estáticos; coloca aquí **`logo.png`** o **`logo.jpg`** para el encabezado del Excel en Vercel
- `server/`: servidor Express opcional para desarrollo local

## Requisitos

- Node.js 18+ (recomendado 20+)
- npm

## Instalación

En la raíz del proyecto:

```bash
npm install
npm run server:install
```

## Configuración del backend (correo y logo)

1) Copia el ejemplo de variables:

- `server/.env.example` → `server/.env`

2) Configura `server/.env`:

- **Correo (SMTP)**
  - `SMTP_USER`: el Gmail que enviará el correo
  - `SMTP_PASS`: **contraseña de aplicación** de Google (sin espacios)
  - `DEST_EMAIL`: destino (por defecto `marcasnt@gmail.com`)

> Recomendación: en Gmail usa **Verificación en 2 pasos** y crea una **Contraseña de aplicación** para SMTP.

- **Logo en el Excel (Vercel)** — elige una:
  - **Recomendado**: sube `public/logo.png` (o `public/logo.jpg`) al repo. La función intentará cargar `https://tu-dominio.vercel.app/logo.png` automáticamente.
  - **Variable**: `LOGO_URL=https://.../logo.png` (PNG o JPG)
  - **Opcional**: `LOGO_BASE_URL=https://tu-dominio.vercel.app` si necesitas forzar el origen

> El logo debe ser **PNG o JPG** (no WebP en el Excel).

## Ejecutar en desarrollo

### 1) Levantar el frontend

En otra terminal:

```bash
npm run dev
```

Vite mostrará la URL local (por ejemplo `http://localhost:5175/`).

### Backend (en producción / Vercel)

Este proyecto está preparado para desplegarse en **Vercel** usando **Functions** en `api/`:

- `POST /api/excel`: genera y descarga el Excel
- `POST /api/submit`: genera, descarga y envía correo

## Uso

En el formulario:

- Completa los datos del atleta.
- En **Categoría**, puedes escribir **una o varias** categorías (separadas por coma), por ejemplo:
  - `Classic Physique, 65 kg, Físico Clásico`
- En **Cédula de identidad**, sube imágenes **JPG/PNG** (frente y reverso).

### Flujo

1. **Enviar Inscripción**: registra el envío, intenta enviar el correo (Excel + imágenes adjuntas) y muestra una **pantalla de éxito**.
2. En esa pantalla puedes **Exportar Excel** (descarga) o **Volver al inicio** para inscribir a otro atleta.

## Notas importantes

- Este proyecto guarda archivos **en memoria** (no los escribe a disco).
- Si el backend no inicia y ves `EADDRINUSE`, significa que el puerto está ocupado. Libera el puerto o cambia `PORT` en `server/.env`.

## Deploy en Vercel

1) Importa el repo en Vercel.
2) Configura variables de entorno (Production y Preview):
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `DEST_EMAIL`
   - (opcional) `LOGO_URL` o `LOGO_BASE_URL`
3) Asegúrate de tener **`public/logo.png`** en el repo (o `LOGO_URL` apuntando a un PNG/JPG público).
4) Deploy.



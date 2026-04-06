# Formulario de Inscripción FENIFISC (2026)

Aplicación web para **registrar atletas** mediante un formulario y generar un **archivo Excel (.xlsx) formateado** con:

- Datos del atleta (datos generales, información deportiva, contacto de emergencia)
- **Imágenes de cédula de identidad** (frente y reverso) **incrustadas** dentro del Excel
- Encabezado con **logo** (opcional) y estilos tipo formulario

Además, al **Enviar Inscripción** se puede **enviar el Excel por correo** con las imágenes adjuntas por separado.

## Tecnologías

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express
  - `exceljs` (generación de Excel con imágenes)
  - `multer` (subida de archivos)
  - `nodemailer` (envío por SMTP)

## Estructura del proyecto

- `src/`: aplicación React (formulario)
- `server/`: servidor Express (genera Excel y envía correo)

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

- **Logo en el Excel (opcional)**
  - Opción 1 (local): `LOGO_PATH=assets/logo.png` (ruta relativa desde `server/`)
  - Opción 2 (URL): `LOGO_URL=https://.../logo.png`

> El logo debe ser **PNG o JPG**.

## Ejecutar en desarrollo

### 1) Levantar el backend

Desde la raíz:

```bash
npm run server:dev
```

Backend por defecto: `http://localhost:8787`

### 2) Levantar el frontend

En otra terminal:

```bash
npm run dev
```

Vite mostrará la URL local (por ejemplo `http://localhost:5175/`).

## Uso

En el formulario:

- Completa los datos del atleta.
- En **Categoría**, puedes escribir **una o varias** categorías (separadas por coma), por ejemplo:
  - `Classic Physique, 65 kg, Físico Clásico`
- En **Cédula de identidad**, sube imágenes **JPG/PNG** (frente y reverso).

### Botones

- **Exportar a Excel**
  - Genera y descarga el Excel **con el mismo formato e imágenes** (no envía correo).
- **Enviar Inscripción**
  - Genera y descarga el Excel **idéntico** al de exportación
  - Intenta **enviar el correo** con:
    - el Excel adjunto
    - las imágenes adjuntas por separado

## Notas importantes

- Este proyecto guarda archivos **en memoria** (no los escribe a disco).
- Si el backend no inicia y ves `EADDRINUSE`, significa que el puerto está ocupado. Libera el puerto o cambia `PORT` en `server/.env`.


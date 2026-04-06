import { useEffect, useState } from 'react';
import { FaUser, FaIdCard, FaMapMarkerAlt, FaPhone, FaEnvelope, FaTrophy, FaUsers, FaExclamationCircle } from 'react-icons/fa';

interface AthleteData {
  // Datos generales
  federacion: string;
  nombresApellidos: string;
  fechaNacimiento: string;
  edad: string;
  genero: string;
  nacionalidad: string;
  identificacion: string;
  lugarNacimiento: string;
  municipio: string;
  estadoCivil: string;
  direccion: string;
  estudiaActualmente: string;
  telefono: string;
  correo: string;
  
  // Información deportiva
  disciplina: string;
  equipoClub: string;
  categoria: string;
  peso: string;
  seleccion: string;
  eventosInternacionales: string;
  anosInicio: string;
  entrenador: string;
  marcasDestacadas: string;
  
  // Emergencia
  nombreContacto: string;
  parentesco: string;
  telefonoContacto: string;
}

const initialFormData: AthleteData = {
  federacion: '',
  nombresApellidos: '',
  fechaNacimiento: '',
  edad: '',
  genero: '',
  nacionalidad: '',
  identificacion: '',
  lugarNacimiento: '',
  municipio: '',
  estadoCivil: '',
  direccion: '',
  estudiaActualmente: '',
  telefono: '',
  correo: '',
  disciplina: '',
  equipoClub: '',
  categoria: '',
  peso: '',
  seleccion: '',
  eventosInternacionales: '',
  anosInicio: '',
  entrenador: '',
  marcasDestacadas: '',
  nombreContacto: '',
  parentesco: '',
  telefonoContacto: '',
};

export default function App() {
  const [formData, setFormData] = useState<AthleteData>(initialFormData);
  const [submitted, setSubmitted] = useState(false);
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idBackFile, setIdBackFile] = useState<File | null>(null);
  const [idFrontPreviewUrl, setIdFrontPreviewUrl] = useState<string | null>(null);
  const [idBackPreviewUrl, setIdBackPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [compressingIdImages, setCompressingIdImages] = useState(false);

  const downloadExcelResponse = async (res: Response) => {
    const blob = await res.blob();
    const cd = res.headers.get('content-disposition') || '';
    const match = cd.match(/filename="([^"]+)"/);
    const filename = match?.[1] || 'Inscripcion.xlsx';

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    return { filename };
  };

  const buildFormData = () => {
    const data = new FormData();
    for (const [key, value] of Object.entries(formData)) {
      data.append(key, value ?? '');
    }
    if (idFrontFile) data.append('idFront', idFrontFile, idFrontFile.name);
    if (idBackFile) data.append('idBack', idBackFile, idBackFile.name);
    return data;
  };

  useEffect(() => {
    return () => {
      if (idFrontPreviewUrl) URL.revokeObjectURL(idFrontPreviewUrl);
      if (idBackPreviewUrl) URL.revokeObjectURL(idBackPreviewUrl);
    };
  }, [idFrontPreviewUrl, idBackPreviewUrl]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleIdImageChange = (side: 'front' | 'back') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;

    const setFile = side === 'front' ? setIdFrontFile : setIdBackFile;
    const setPreviewUrl = side === 'front' ? setIdFrontPreviewUrl : setIdBackPreviewUrl;
    const currentPreviewUrl = side === 'front' ? idFrontPreviewUrl : idBackPreviewUrl;

    if (currentPreviewUrl) URL.revokeObjectURL(currentPreviewUrl);

    if (!file) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setFile(null);
      setPreviewUrl(null);
      e.target.value = '';
      return;
    }

    if (file.type !== 'image/jpeg' && file.type !== 'image/jpg' && file.type !== 'image/png') {
      setFile(null);
      setPreviewUrl(null);
      e.target.value = '';
      return;
    }

    const compress = async () => {
      setCompressingIdImages(true);
      try {
        const maxBytes = 3.5 * 1024 * 1024; // ~3.5MB objetivo por imagen (Vercel Hobby friendly)
        const maxDim = 2000;
        const quality = 0.82;

        const toCompressed = async (input: File) => {
          // Si ya es pequeño, lo dejamos igual (siempre que sea JPG/PNG)
          if (input.size <= maxBytes) return input;

          const imgUrl = URL.createObjectURL(input);
          try {
            const img = await new Promise<HTMLImageElement>((resolve, reject) => {
              const el = new Image();
              el.onload = () => resolve(el);
              el.onerror = () => reject(new Error('No se pudo leer la imagen.'));
              el.src = imgUrl;
            });

            const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
            const w = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
            const h = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas no disponible.');
            ctx.drawImage(img, 0, 0, w, h);

            const blob: Blob = await new Promise((resolve, reject) => {
              canvas.toBlob(
                (b) => (b ? resolve(b) : reject(new Error('No se pudo comprimir la imagen.'))),
                'image/jpeg',
                quality
              );
            });

            const baseName = input.name.replace(/\.(png|jpe?g)$/i, '');
            return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
          } finally {
            URL.revokeObjectURL(imgUrl);
          }
        };

        const finalFile = await toCompressed(file);
        setFile(finalFile);
        setPreviewUrl(URL.createObjectURL(finalFile));
      } catch {
        setFile(null);
        setPreviewUrl(null);
        e.target.value = '';
      } finally {
        setCompressingIdImages(false);
      }
    };

    // Fire and forget (async)
    void compress();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);

    const data = buildFormData();

    fetch('/api/submit', {
      method: 'POST',
      body: data,
    })
      .then(async (res) => {
        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          const msg = payload?.error || 'No se pudo enviar la inscripción.';
          throw new Error(msg);
        }

        await downloadExcelResponse(res);
        const emailStatus = res.headers.get('x-email-status') || 'ok';
        const emailError = res.headers.get('x-email-error') || '';

        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 3000);

        if (emailStatus !== 'ok') {
          setSubmitError(
            `El Excel se generó y se descargó, pero el correo falló: ${emailError || 'credenciales SMTP inválidas'}`
          );
        }
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Error desconocido al enviar.';
        setSubmitError(msg);
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  const exportToExcel = () => {
    setSubmitError(null);
    const data = buildFormData();

    fetch('/api/excel', {
      method: 'POST',
      body: data,
    })
      .then(async (res) => {
        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          const msg = payload?.error || 'No se pudo generar el Excel.';
          throw new Error(msg);
        }
        await downloadExcelResponse(res);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Error desconocido al exportar.';
        setSubmitError(msg);
      });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-amber-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header con Logo */}
        <div className="bg-white rounded-t-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-green-700 via-green-600 to-amber-500 p-6">
            <div className="flex items-center justify-center gap-4">
              <img 
                src="https://fenifisc.com/wp-content/uploads/2026/04/FENIFISC-OFICIAL.webp" 
                alt="FENIFISC Logo"
                className="h-20 w-auto bg-white rounded-lg p-2 shadow-md"
              />
              <div className="text-white text-center">
                <h1 className="text-3xl font-bold mb-2">FENIFISC</h1>
                <p className="text-lg opacity-90">Federación Nacional de Fisiculturismo</p>
              </div>
            </div>
          </div>
          
          <div className="bg-amber-400 py-4">
            <h2 className="text-2xl font-bold text-center text-gray-800">
              FORMULARIO DE INSCRIPCIÓN DEL ATLETA
            </h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-b-2xl p-6 space-y-6">
          {/* Sección 1: Datos Generales */}
          <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
            <div className="bg-amber-300 px-4 py-3">
              <h3 className="text-lg font-bold text-gray-800">DATOS GENERALES DEL ATLETA</h3>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Federación */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  FEDERACIÓN
                </label>
                <input
                  type="text"
                  name="federacion"
                  value={formData.federacion}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-green-600 focus:outline-none transition-colors"
                  placeholder="Nombre de la federación"
                />
              </div>

              {/* Nombres y Apellidos */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <FaUser className="text-green-600" />
                  Nombres y Apellidos:
                </label>
                <input
                  type="text"
                  name="nombresApellidos"
                  value={formData.nombresApellidos}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-green-600 focus:outline-none transition-colors"
                  placeholder="Ingrese nombres y apellidos completos"
                />
              </div>

              {/* Fecha de nacimiento, Edad, Género */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <FaUser className="text-green-600" />
                  Fecha de nacimiento:
                </label>
                  <input
                    type="date"
                    name="fechaNacimiento"
                    value={formData.fechaNacimiento}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-green-600 focus:outline-none transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Edad:
                  </label>
                  <input
                    type="number"
                    name="edad"
                    value={formData.edad}
                    onChange={handleChange}
                    required
                    min="0"
                    max="120"
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-green-600 focus:outline-none transition-colors"
                    placeholder="Edad"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Género:
                  </label>
                  <select
                    name="genero"
                    value={formData.genero}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-green-600 focus:outline-none transition-colors"
                  >
                    <option value="">Seleccione</option>
                    <option value="Femenino">Femenino</option>
                    <option value="Masculino">Masculino</option>
                  </select>
                </div>
              </div>

              {/* Nacionalidad y Identificación */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nacionalidad:
                  </label>
                  <input
                    type="text"
                    name="nacionalidad"
                    value={formData.nacionalidad}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-green-600 focus:outline-none transition-colors"
                    placeholder="Nacionalidad"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <FaIdCard className="text-green-600" />
                    Número de identificación:
                  </label>
                  <input
                    type="text"
                    name="identificacion"
                    value={formData.identificacion}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-green-600 focus:outline-none transition-colors"
                    placeholder="Cédula/pasaporte"
                  />
                </div>
              </div>

              {/* Carga de cédula (frente / reverso) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <FaIdCard className="text-green-600" />
                  Carga cédula de identidad (Frente / Reverso):
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border-2 border-gray-300 rounded-lg p-3">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Frente</p>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={handleIdImageChange('front')}
                      className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700"
                    />
                    <div className="mt-2 flex items-center gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-gray-600 truncate">
                          {idFrontFile ? idFrontFile.name : 'Sin archivo seleccionado'}
                        </p>
                      </div>
                      {idFrontPreviewUrl && (
                        <img
                          src={idFrontPreviewUrl}
                          alt="Previsualización cédula (frente)"
                          className="h-12 w-20 object-cover rounded-md border border-gray-200"
                        />
                      )}
                    </div>
                  </div>

                  <div className="border-2 border-gray-300 rounded-lg p-3">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Reverso</p>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={handleIdImageChange('back')}
                      className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700"
                    />
                    <div className="mt-2 flex items-center gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-gray-600 truncate">
                          {idBackFile ? idBackFile.name : 'Sin archivo seleccionado'}
                        </p>
                      </div>
                      {idBackPreviewUrl && (
                        <img
                          src={idBackPreviewUrl}
                          alt="Previsualización cédula (reverso)"
                          className="h-12 w-20 object-cover rounded-md border border-gray-200"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <p className="mt-2 text-xs text-gray-500">
                  Solo se aceptan imágenes JPG o PNG. Si pesan mucho, se comprimen automáticamente para el envío. En el Excel se incrustan las imágenes.
                </p>
              </div>

              {/* Lugar de nacimiento, Municipio, Estado Civil */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <FaMapMarkerAlt className="text-green-600" />
                    Lugar de Nacimiento:
                  </label>
                  <input
                    type="text"
                    name="lugarNacimiento"
                    value={formData.lugarNacimiento}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-green-600 focus:outline-none transition-colors"
                    placeholder="Ciudad, Departamento/Estado"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Municipio:
                  </label>
                  <input
                    type="text"
                    name="municipio"
                    value={formData.municipio}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-green-600 focus:outline-none transition-colors"
                    placeholder="Municipio"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Estado Civil:
                  </label>
                  <select
                    name="estadoCivil"
                    value={formData.estadoCivil}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-green-600 focus:outline-none transition-colors"
                  >
                    <option value="">Seleccione</option>
                    <option value="Soltero/a">Soltero/a</option>
                    <option value="Casado/a">Casado/a</option>
                    <option value="Divorciado/a">Divorciado/a</option>
                    <option value="Viudo/a">Viudo/a</option>
                    <option value="Unión libre">Unión libre</option>
                  </select>
                </div>
              </div>

              {/* Dirección */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Dirección:
                </label>
                <textarea
                  name="direccion"
                  value={formData.direccion}
                  onChange={handleChange}
                  required
                  rows={2}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-green-600 focus:outline-none transition-colors resize-none"
                  placeholder="Dirección completa"
                />
              </div>

              {/* Estudia actualmente y Teléfono */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Estudia Actualmente:
                  </label>
                  <select
                    name="estudiaActualmente"
                    value={formData.estudiaActualmente}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-green-600 focus:outline-none transition-colors"
                  >
                    <option value="">Seleccione</option>
                    <option value="Sí">Sí</option>
                    <option value="No">No</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <FaPhone className="text-green-600" />
                    Teléfono del atleta:
                  </label>
                  <input
                    type="tel"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-green-600 focus:outline-none transition-colors"
                    placeholder="Teléfono de contacto"
                  />
                </div>
              </div>

              {/* Correo electrónico */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <FaEnvelope className="text-green-600" />
                  Correo electrónico:
                </label>
                <input
                  type="email"
                  name="correo"
                  value={formData.correo}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-green-600 focus:outline-none transition-colors"
                  placeholder="correo@ejemplo.com"
                />
              </div>
            </div>
          </div>

          {/* Sección 2: Información Deportiva */}
          <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
            <div className="bg-green-200 px-4 py-3">
              <h3 className="text-lg font-bold text-gray-800">INFORMACIÓN DEPORTIVA</h3>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Disciplina y Equipo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <FaTrophy className="text-green-600" />
                    Disciplina Deportiva:
                  </label>
                  <input
                    type="text"
                    name="disciplina"
                    value={formData.disciplina}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-green-600 focus:outline-none transition-colors"
                    placeholder="Disciplina"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <FaUsers className="text-green-600" />
                    Equipo o club al que pertenece:
                  </label>
                  <input
                    type="text"
                    name="equipoClub"
                    value={formData.equipoClub}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-green-600 focus:outline-none transition-colors"
                    placeholder="Nombre del equipo o club"
                  />
                </div>
              </div>

              {/* Categoría y Peso */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Categoría:
                  </label>
                  <input
                    type="text"
                    name="categoria"
                    value={formData.categoria}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-green-600 focus:outline-none transition-colors"
                    placeholder="Ej: Classic Physique, 65 kg, Físico Clásico"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Puedes escribir una o varias categorías separadas por coma.
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Peso:
                  </label>
                  <input
                    type="number"
                    name="peso"
                    value={formData.peso}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.1"
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-green-600 focus:outline-none transition-colors"
                    placeholder="Peso en kg"
                  />
                </div>
              </div>

              {/* Selección y Eventos Internacionales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Selección:
                  </label>
                  <select
                    name="seleccion"
                    value={formData.seleccion}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-green-600 focus:outline-none transition-colors"
                  >
                    <option value="">Seleccione</option>
                    <option value="Preselección">Preselección</option>
                    <option value="Selección Nacional">Selección Nacional</option>
                    <option value="No">No</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Ha participado en Eventos Internacionales:
                  </label>
                  <select
                    name="eventosInternacionales"
                    value={formData.eventosInternacionales}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-green-600 focus:outline-none transition-colors"
                  >
                    <option value="">Seleccione</option>
                    <option value="Sí">Sí</option>
                    <option value="No">No</option>
                  </select>
                </div>
              </div>

              {/* Años de inicio y Entrenador */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <FaUser className="text-green-600" />
                  Años de inicio:
                </label>
                  <input
                    type="number"
                    name="anosInicio"
                    value={formData.anosInicio}
                    onChange={handleChange}
                    required
                    min="0"
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-green-600 focus:outline-none transition-colors"
                    placeholder="Años de experiencia"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nombre del Entrenador:
                  </label>
                  <input
                    type="text"
                    name="entrenador"
                    value={formData.entrenador}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-green-600 focus:outline-none transition-colors"
                    placeholder="Nombre completo del entrenador"
                  />
                </div>
              </div>

              {/* Marcas destacadas */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <FaTrophy className="text-green-600" />
                  Registro / Marcas destacadas:
                </label>
                <textarea
                  name="marcasDestacadas"
                  value={formData.marcasDestacadas}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-green-600 focus:outline-none transition-colors resize-none"
                  placeholder="Principales logros y marcas personales"
                />
              </div>
            </div>
          </div>

          {/* Sección 3: Información de Emergencia */}
          <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
            <div className="bg-amber-300 px-4 py-3">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FaExclamationCircle />
                INFORMACIÓN DE CONTACTO EN CASO DE EMERGENCIA
              </h3>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Nombre del contacto */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre del contacto:
                </label>
                <input
                  type="text"
                  name="nombreContacto"
                  value={formData.nombreContacto}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-green-600 focus:outline-none transition-colors"
                  placeholder="Nombre completo del contacto de emergencia"
                />
              </div>

              {/* Parentesco y Teléfono */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Parentesco:
                  </label>
                  <input
                    type="text"
                    name="parentesco"
                    value={formData.parentesco}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-green-600 focus:outline-none transition-colors"
                    placeholder="Relación con el atleta"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <FaPhone className="text-green-600" />
                    Teléfono:
                  </label>
                  <input
                    type="tel"
                    name="telefonoContacto"
                    value={formData.telefonoContacto}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-green-600 focus:outline-none transition-colors"
                    placeholder="Teléfono de emergencia"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button
              type="submit"
              disabled={submitting || compressingIdImages}
              className="flex-1 bg-gradient-to-r from-green-600 to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-8 py-3 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 disabled:hover:from-gray-400 disabled:hover:to-gray-500 transform hover:scale-105 disabled:hover:scale-100 transition-all duration-200 shadow-lg"
            >
              {compressingIdImages ? 'Procesando imágenes...' : submitting ? 'Enviando...' : submitted ? '¡Formulario Enviado!' : 'Enviar Inscripción'}
            </button>
            
            <button
              type="button"
              onClick={exportToExcel}
              className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-amber-600 hover:to-amber-700 transform hover:scale-105 transition-all duration-200 shadow-lg flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
              Exportar a Excel
            </button>
          </div>

          {/* Mensaje de éxito */}
          {submitted && (
            <div className="bg-green-100 border-2 border-green-500 text-green-700 px-4 py-3 rounded-lg text-center font-semibold animate-pulse">
              ¡Enviado! Se descargó el Excel y también se envió al correo configurado.
            </div>
          )}

          {submitError && (
            <div className="bg-red-100 border-2 border-red-500 text-red-700 px-4 py-3 rounded-lg text-center font-semibold">
              {submitError}
            </div>
          )}

          {/* Firmas */}
          <div className="border-t-2 border-gray-300 pt-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="text-center">
                <div className="border-b-2 border-gray-400 h-16 mb-2"></div>
                <p className="text-sm font-semibold text-gray-700">Firma del Presidente de la Federación</p>
              </div>
              <div className="text-center">
                <div className="border-b-2 border-gray-400 h-16 mb-2"></div>
                <p className="text-sm font-semibold text-gray-700">Firma del Atleta o Tutor Legal</p>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="bg-gradient-to-r from-green-700 to-green-600 text-white text-center py-4 rounded-b-2xl mt-0">
          <p className="text-sm">© 2026 FENIFISC - Todos los derechos reservados</p>
        </div>
      </div>
    </div>
  );
}

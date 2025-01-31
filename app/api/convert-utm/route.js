import { NextResponse } from 'next/server';
import proj4 from 'proj4';
import * as XLSX from 'xlsx';

// Función para verificar si un valor es vacío o cero
function isEmptyOrZero(value) {
  return value === undefined || value === null || value === '' || value === 0 || value === '0';
}

// Función para convertir coordenadas UTM a Lat/Long
function convertUTMToLatLong(x, y, zone, hemisphere) {
  // Si x o y son vacíos o cero, retornar valores vacíos
  if (isEmptyOrZero(x) || isEmptyOrZero(y)) {
    return { latitude: '', longitude: '' };
  }

  try {
    // Crear la proyección UTM para la zona específica
    const utmZone = zone.toString().padStart(2, '0');
    const proj = `+proj=utm +zone=${utmZone} ${hemisphere === 1 ? '+south' : ''} +ellps=WGS84 +datum=WGS84 +units=m +no_defs`;
    
    // Configurar las proyecciones
    const utmProjection = proj;
    const wgs84Projection = 'EPSG:4326';
    
    // Realizar la conversión
    const [longitude, latitude] = proj4(utmProjection, wgs84Projection, [parseFloat(x), parseFloat(y)]);
    
    return { latitude, longitude };
  } catch (error) {
    console.error('Error en la conversión:', error);
    return { latitude: '', longitude: '' };
  }
}

export async function POST(request) {
  try {
    const data = await request.formData();
    const file = data.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No se ha proporcionado ningún archivo' }, { status: 400 });
    }

    // Verificar que sea un archivo Excel
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      return NextResponse.json({ error: 'El archivo debe ser un Excel (.xlsx o .xls)' }, { status: 400 });
    }

    // Leer el archivo Excel
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // Obtener la primera hoja
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    // Convertir cada fila
    const convertedData = jsonData.map((row, index) => {
      try {
        const { x, y, zona, Hemisferio } = row;
        
        // Si falta zona o Hemisferio, mantener los valores originales y agregar columnas vacías
        if (zona === undefined || Hemisferio === undefined) {
          return {
            ...row,
            latitud: '',
            longitud: '',
            error: 'Faltan campos requeridos (zona o Hemisferio)'
          };
        }

        const { latitude, longitude } = convertUTMToLatLong(x, y, zona, Hemisferio);
        
        return {
          ...row,
          latitud: latitude,
          longitud: longitude
        };
      } catch (error) {
        console.error(`Error en la fila ${index + 1}:`, error);
        return {
          ...row,
          latitud: '',
          longitud: '',
          error: `Error en la conversión: ${error.message}`
        };
      }
    });

    // Crear un nuevo libro de Excel con los resultados
    const newWorkbook = XLSX.utils.book_new();
    const newWorksheet = XLSX.utils.json_to_sheet(convertedData);

    // Ajustar el ancho de las columnas
    const wscols = [
      {wch: 15}, // x
      {wch: 15}, // y
      {wch: 8},  // zona
      {wch: 10}, // Hemisferio
      {wch: 15}, // latitud
      {wch: 15}, // longitud
      {wch: 30}  // error (si existe)
    ];
    newWorksheet['!cols'] = wscols;

    XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Resultados');

    // Convertir el libro a buffer
    const outputBuffer = XLSX.write(newWorkbook, { type: 'buffer', bookType: 'xlsx' });

    // Devolver el archivo
    return new NextResponse(outputBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="coordenadas_convertidas.xlsx"'
      }
    });

  } catch (error) {
    console.error('Error al procesar el archivo:', error);
    return NextResponse.json({ 
      error: 'Error al procesar el archivo',
      details: error.message
    }, { status: 500 });
  }
}

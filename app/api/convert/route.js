import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import fs from 'fs-extra';
import path from 'path';
import { createReadStream } from 'fs';
import shpStream from 'shp-stream';

export async function POST(request) {
  try {
    const data = await request.formData();
    const file = data.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No se ha proporcionado ningún archivo' }, { status: 400 });
    }

    // Verificar que sea un archivo .shp
    if (!file.name.endsWith('.shp')) {
      return NextResponse.json({ error: 'El archivo debe ser un .shp' }, { status: 400 });
    }

    // Configurar directorios
    const uploadDir = path.join(process.cwd(), 'uploads');
    const outputDir = path.join(process.cwd(), 'public', 'output');
    
    // Asegurar que los directorios existan
    await fs.ensureDir(uploadDir);
    await fs.ensureDir(outputDir);

    // Guardar el archivo temporalmente
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tempFilePath = path.join(uploadDir, file.name);
    await writeFile(tempFilePath, buffer);

    try {
      // Crear un stream de lectura del archivo shapefile
      const reader = shpStream.reader(tempFilePath);
      const features = [];

      // Leer todas las características
      for await (const feature of reader) {
        features.push(feature);
      }

      // Crear el objeto GeoJSON
      const geojson = {
        type: 'FeatureCollection',
        features: features
      };

      // Guardar GeoJSON
      const outputFileName = file.name.replace('.shp', '.geojson');
      const outputPath = path.join(outputDir, outputFileName);
      await fs.writeJson(outputPath, geojson, { spaces: 2 });

      return NextResponse.json({ 
        success: true, 
        message: 'Archivo convertido exitosamente',
        outputFile: `/output/${outputFileName}`
      });
    } catch (error) {
      console.error('Error al convertir el archivo:', error);
      return NextResponse.json({ 
        error: 'Error al convertir el archivo',
        details: error.message
      }, { status: 500 });
    } finally {
      // Limpiar archivo temporal
      await fs.unlink(tempFilePath).catch(console.error);
    }

  } catch (error) {
    console.error('Error al procesar el archivo:', error);
    return NextResponse.json({ 
      error: 'Error al procesar el archivo',
      details: error.message
    }, { status: 500 });
  }
}

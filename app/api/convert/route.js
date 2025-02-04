import { NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'path';
import shp from 'shpjs';

export async function POST(request) {
  try {
    const data = await request.formData();
    const shpFile = data.get('file.shp');

    if (!shpFile) {
      return NextResponse.json({ error: 'No se ha proporcionado el archivo .shp' }, { status: 400 });
    }

    // Configurar directorios
    const uploadDir = path.join(process.cwd(), 'uploads');
    const outputDir = path.join(process.cwd(), 'public', 'output');
    
    // Asegurar que los directorios existan con los permisos correctos
    await fs.ensureDir(uploadDir, { mode: 0o777 });
    await fs.ensureDir(outputDir, { mode: 0o777 });

    // Generar un nombre base único para los archivos
    const timestamp = Date.now();
    const baseName = shpFile.name.slice(0, -4);
    const uniqueBaseName = `${timestamp}-${baseName}`;

    try {
      // Leer el archivo .shp
      const shpBuffer = Buffer.from(await shpFile.arrayBuffer());
      
      // Leer el archivo .dbf si existe
      const dbfFile = data.get('file.dbf');
      let dbfBuffer = null;
      if (dbfFile) {
        dbfBuffer = Buffer.from(await dbfFile.arrayBuffer());
      }

      // Convertir a GeoJSON
      const geojson = await shp.combine([
        await shp.parseShp(shpBuffer),
        dbfBuffer ? await shp.parseDbf(dbfBuffer) : null
      ].filter(Boolean));

      // Guardar GeoJSON
      const outputFileName = uniqueBaseName + '.geojson';
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
    }

  } catch (error) {
    console.error('Error al procesar el archivo:', error);
    return NextResponse.json({ 
      error: 'Error al procesar el archivo',
      details: error.message
    }, { status: 500 });
  }
}

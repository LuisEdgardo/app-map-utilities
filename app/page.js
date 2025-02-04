'use client';
import { useState } from 'react';
import { ThemeSwitcher } from './components/theme-switcher';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleShpUpload = async (e) => {
    e.preventDefault();
    const files = Array.from(e.target.file.files);
    const shpFile = files.find(f => f.name.endsWith('.shp'));
    
    if (!shpFile) {
      setError('Debe seleccionar un archivo .shp');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    
    // Obtener el nombre base del archivo (sin extensión)
    const baseName = shpFile.name.slice(0, -4);
    
    // Agregar todos los archivos relacionados que coincidan con el nombre base
    files.forEach(file => {
      const ext = file.name.slice(file.name.lastIndexOf('.'));
      if (file.name.startsWith(baseName)) {
        switch (ext.toLowerCase()) {
          case '.shp':
          case '.dbf':
          case '.prj':
          case '.shx':
          case '.sbn':
          case '.sbx':
            formData.append(`file${ext}`, file);
            break;
        }
      }
    });

    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al convertir el archivo');
      }

      const data = await response.json();
      setSuccess({
        message: data.message,
        downloadUrl: data.outputFile
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUtmUpload = async (e) => {
    e.preventDefault();
    const file = e.target.file.files[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/convert-utm', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al convertir el archivo');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'coordenadas_convertidas.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess({
        message: 'Archivo convertido exitosamente'
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8 text-gray-900 dark:text-gray-100">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Conversor de Coordenadas</h1>
          <ThemeSwitcher />
        </div>

        <Tabs defaultValue="shp" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="shp">SHP a GeoJSON</TabsTrigger>
            <TabsTrigger value="utm">UTM a Lat/Long</TabsTrigger>
          </TabsList>

          <TabsContent value="shp" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Convertir SHP a GeoJSON</CardTitle>
                <CardDescription>
                  Selecciona todos los archivos relacionados (.shp, .dbf, .prj, .shx, .sbn, .sbx)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleShpUpload}>
                  <div className="space-y-4">
                    <input
                      type="file"
                      name="file"
                      multiple
                      accept=".shp,.dbf,.prj,.shx,.sbn,.sbx"
                      className="w-full border dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700"
                    />
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Convirtiendo...' : 'Convertir a GeoJSON'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="utm">
            <Card>
              <CardHeader>
                <CardTitle>Convertir Coordenadas UTM a Lat/Long</CardTitle>
                <CardDescription className="space-y-2">
                  El archivo Excel debe contener las siguientes columnas:
                  <ul className="list-disc list-inside mt-1 space-y-1 text-sm text-muted-foreground">
                    <li>x (coordenada X en UTM)</li>
                    <li>y (coordenada Y en UTM)</li>
                    <li>zona (número de zona UTM)</li>
                    <li>Hemisferio (1 para Sur, 0 para Norte)</li>
                  </ul>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUtmUpload} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Archivo Excel
                    </label>
                    <input
                      type="file"
                      name="file"
                      accept=".xlsx,.xls"
                      className="w-full border dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700"
                    />
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Convirtiendo...' : 'Convertir Coordenadas'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="mt-4 p-4 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg border border-red-400/20">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 p-4 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg border border-green-400/20">
            {success.message}
            {success.downloadUrl && (
              <div className="mt-2">
                <Button variant="link" asChild>
                  <a href={success.downloadUrl} download>
                    Descargar archivo convertido
                  </a>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

/**
 * Utilidades para procesamiento de audio
 * 
 * Funciones para manipular y procesar archivos de audio.
 */

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

// Convertir funciones de callback a promesas
const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);
const copyFile = promisify(fs.copyFile);

// Configuración de rutas
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Verifica si un archivo es un archivo de audio válido
 * @param {string} filePath - Ruta al archivo
 * @returns {Promise<boolean>} - Resultado de la validación
 */
export async function isValidAudioFile(filePath) {
  try {
    // Verificar que el archivo existe
    const stats = await stat(filePath);
    if (!stats.isFile()) {
      return false;
    }
    
    // Verificar extensión
    const validExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.flac'];
    const ext = path.extname(filePath).toLowerCase();
    if (!validExtensions.includes(ext)) {
      return false;
    }
    
    // Verificar tamaño mínimo (para evitar archivos vacíos)
    const minSize = 1024; // 1 KB
    if (stats.size < minSize) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error al validar archivo de audio:', error);
    return false;
  }
}

/**
 * Guarda un archivo de audio en el directorio de almacenamiento
 * @param {string} sourceFilePath - Ruta al archivo original
 * @param {string} fileName - Nombre para el archivo guardado
 * @param {string} storageDir - Directorio de almacenamiento
 * @returns {Promise<string>} - Ruta al archivo guardado
 */
export async function saveAudioFile(sourceFilePath, fileName, storageDir) {
  try {
    // Crear directorio si no existe
    await mkdir(storageDir, { recursive: true });
    
    // Generar nombre de archivo único si no se proporciona
    const finalFileName = fileName || `audio_${Date.now()}${path.extname(sourceFilePath)}`;
    const targetPath = path.join(storageDir, finalFileName);
    
    // Copiar archivo
    await copyFile(sourceFilePath, targetPath);
    
    return targetPath;
  } catch (error) {
    console.error('Error al guardar archivo de audio:', error);
    throw error;
  }
}

/**
 * Obtiene información sobre un archivo de audio
 * @param {string} filePath - Ruta al archivo
 * @returns {Promise<object>} - Información del archivo
 */
export async function getAudioFileInfo(filePath) {
  try {
    const stats = await stat(filePath);
    const ext = path.extname(filePath).toLowerCase();
    
    return {
      path: filePath,
      name: path.basename(filePath),
      extension: ext,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      isAudioFile: ['.mp3', '.wav', '.ogg', '.m4a', '.flac'].includes(ext)
    };
  } catch (error) {
    console.error('Error al obtener información del archivo de audio:', error);
    throw error;
  }
}

/**
 * Lista todos los archivos de audio en un directorio
 * @param {string} directory - Directorio a escanear
 * @returns {Promise<Array>} - Lista de archivos de audio
 */
export async function listAudioFiles(directory) {
  try {
    // Crear directorio si no existe
    await mkdir(directory, { recursive: true });
    
    // Leer directorio
    const files = await readdir(directory);
    
    // Filtrar archivos de audio
    const audioFiles = [];
    for (const file of files) {
      const filePath = path.join(directory, file);
      if (await isValidAudioFile(filePath)) {
        audioFiles.push(await getAudioFileInfo(filePath));
      }
    }
    
    return audioFiles;
  } catch (error) {
    console.error('Error al listar archivos de audio:', error);
    throw error;
  }
}

/**
 * Elimina un archivo de audio
 * @param {string} filePath - Ruta al archivo
 * @returns {Promise<boolean>} - Éxito de la operación
 */
export async function deleteAudioFile(filePath) {
  try {
    // Verificar que el archivo existe y es un archivo de audio
    if (!(await isValidAudioFile(filePath))) {
      return false;
    }
    
    // Eliminar archivo
    await promisify(fs.unlink)(filePath);
    return true;
  } catch (error) {
    console.error('Error al eliminar archivo de audio:', error);
    return false;
  }
}

export default {
  isValidAudioFile,
  saveAudioFile,
  getAudioFileInfo,
  listAudioFiles,
  deleteAudioFile
};

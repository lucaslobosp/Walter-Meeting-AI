/**
 * Servicio para transcribir audio usando Whisper localmente
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Transcribe un archivo de audio usando Whisper localmente
 * @param {string} audioFilePath - Ruta al archivo de audio
 * @param {string} language - Código de idioma (es, en, etc.)
 * @returns {Promise<object>} - Transcripción generada
 */
export async function transcribeWithWhisperLocal(audioFilePath, language = 'es') {
  try {
    console.log('Transcribiendo audio con Whisper local...');
    console.log(`Archivo de audio: ${audioFilePath}`);
    
    // Verificar que el archivo existe
    if (!fs.existsSync(audioFilePath)) {
      throw new Error(`El archivo de audio no existe: ${audioFilePath}`);
    }
    
    // Verificar que el archivo es accesible
    const stats = fs.statSync(audioFilePath);
    console.log(`Tamaño del archivo: ${stats.size} bytes`);
    
    if (stats.size === 0) {
      throw new Error('El archivo de audio está vacío');
    }
    
    // Crear directorio para la transcripción si no existe
    const transcriptionsDir = path.join(process.cwd(), 'storage', 'transcriptions');
    if (!fs.existsSync(transcriptionsDir)) {
      fs.mkdirSync(transcriptionsDir, { recursive: true });
    }
    
    // Generar nombre para el archivo de transcripción
    const outputBaseName = path.basename(audioFilePath, path.extname(audioFilePath));
    const outputJsonPath = path.join(transcriptionsDir, `${outputBaseName}.json`);
    const outputTxtPath = path.join(transcriptionsDir, `${outputBaseName}.txt`);
    
    // Comando para ejecutar Whisper
    // Nota: Esto asume que whisper está instalado y disponible en el PATH
    const command = `whisper "${audioFilePath}" --model tiny --language ${language} --output_dir "${transcriptionsDir}" --output_format json txt`;
    
    console.log(`Ejecutando comando: ${command}`);
    
    // Ejecutar Whisper
    const { stdout, stderr } = await execAsync(command);
    
    console.log('Salida de Whisper:', stdout);
    if (stderr) {
      console.warn('Errores de Whisper:', stderr);
    }
    
    // Verificar que se generaron los archivos de transcripción
    if (!fs.existsSync(outputJsonPath)) {
      throw new Error(`No se generó el archivo JSON de transcripción: ${outputJsonPath}`);
    }
    
    // Leer el archivo JSON de transcripción
    const transcriptionJson = JSON.parse(fs.readFileSync(outputJsonPath, 'utf8'));
    
    // Leer el archivo TXT de transcripción
    const transcriptionText = fs.existsSync(outputTxtPath) 
      ? fs.readFileSync(outputTxtPath, 'utf8')
      : transcriptionJson.text;
    
    console.log('Transcripción completada con Whisper local');
    console.log(`Texto transcrito: ${transcriptionText.substring(0, 100)}...`);
    
    // Formatear la respuesta
    return {
      text: transcriptionText,
      segments: transcriptionJson.segments.map(segment => ({
        text: segment.text,
        start: segment.start,
        end: segment.end
      }))
    };
  } catch (error) {
    console.error('Error al transcribir audio con Whisper local:', error);
    console.error('Detalles del error:', error.message);
    throw error;
  }
}

/**
 * Servicio para transcribir audio usando la herramienta de línea de comandos de Whisper
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Verifica si Whisper CLI está instalado
 * @returns {Promise<boolean>} - true si Whisper está instalado, false en caso contrario
 */
export async function isWhisperInstalled() {
  try {
    // Intentar ejecutar whisper directamente
    try {
      await execAsync('whisper --help');
      return true;
    } catch (directError) {
      console.log('Whisper no está disponible directamente, intentando con python -m...');
    }

    // Intentar ejecutar whisper a través de python -m
    try {
      await execAsync('python -m whisper --help');
      return true;
    } catch (pythonError) {
      console.log('Whisper no está disponible a través de python -m, intentando con python3 -m...');
    }

    // Intentar ejecutar whisper a través de python3 -m
    try {
      await execAsync('python3 -m whisper --help');
      return true;
    } catch (python3Error) {
      console.log('Whisper no está disponible a través de python3 -m');
    }

    return false;
  } catch (error) {
    console.error('Error al verificar Whisper:', error);
    return false;
  }
}

/**
 * Transcribe un archivo de audio usando Whisper CLI
 * @param {string} audioFilePath - Ruta al archivo de audio
 * @param {object} options - Opciones de transcripción
 * @param {string} options.model - Modelo a utilizar (tiny, base, small, medium, large)
 * @param {string} options.language - Código de idioma (es, en, etc.)
 * @returns {Promise<object>} - Transcripción generada
 */
export async function transcribeWithWhisperCLI(audioFilePath, options = {}) {
  try {
    console.log('Transcribiendo audio con Whisper CLI...');
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

    // Verificar si Whisper está instalado
    const whisperInstalled = await isWhisperInstalled();
    if (!whisperInstalled) {
      throw new Error('Whisper CLI no está instalado. Por favor, instálalo con: pip install -U openai-whisper');
    }

    // Configurar opciones
    const model = options.model || 'medium'; // Usar medium por defecto para mejor calidad
    const language = options.language || 'es';

    // Crear directorio para la transcripción si no existe
    const transcriptionsDir = path.join(process.cwd(), 'storage', 'transcriptions');
    if (!fs.existsSync(transcriptionsDir)) {
      fs.mkdirSync(transcriptionsDir, { recursive: true });
    }

    // Generar nombre para el archivo de transcripción
    const outputBaseName = path.basename(audioFilePath, path.extname(audioFilePath));
    const outputJsonPath = path.join(transcriptionsDir, `${outputBaseName}.json`);
    const outputTxtPath = path.join(transcriptionsDir, `${outputBaseName}.txt`);

    // Intentar diferentes comandos para ejecutar Whisper
    let command = '';
    let stdout = '';
    let stderr = '';

    // Intentar ejecutar whisper directamente
    try {
      command = `whisper "${audioFilePath}" --model ${model} --language ${language} --output_dir "${transcriptionsDir}" --output_format json txt`;
      console.log(`Intentando ejecutar comando: ${command}`);
      ({ stdout, stderr } = await execAsync(command, { maxBuffer: 10 * 1024 * 1024 })); // 10MB buffer
    } catch (directError) {
      console.log('No se pudo ejecutar whisper directamente, intentando con python -m...');

      // Intentar ejecutar whisper a través de python -m
      try {
        command = `python -m whisper "${audioFilePath}" --model ${model} --language ${language} --output_dir "${transcriptionsDir}" --output_format json txt`;
        console.log(`Intentando ejecutar comando: ${command}`);
        ({ stdout, stderr } = await execAsync(command, { maxBuffer: 10 * 1024 * 1024 })); // 10MB buffer
      } catch (pythonError) {
        console.log('No se pudo ejecutar whisper con python -m, intentando con python3 -m...');

        // Intentar ejecutar whisper a través de python3 -m
        command = `python3 -m whisper "${audioFilePath}" --model ${model} --language ${language} --output_dir "${transcriptionsDir}" --output_format json txt`;
        console.log(`Intentando ejecutar comando: ${command}`);
        ({ stdout, stderr } = await execAsync(command, { maxBuffer: 10 * 1024 * 1024 })); // 10MB buffer
      }
    }

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

    console.log('Transcripción completada con Whisper CLI');
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
    console.error('Error al transcribir audio con Whisper CLI:', error);
    console.error('Detalles del error:', error.message);
    throw error;
  }
}

/**
 * Instrucciones para instalar Whisper CLI
 * @returns {string} - Instrucciones de instalación
 */
export function getWhisperInstallationInstructions() {
  return `
Para instalar Whisper CLI, sigue estos pasos:

1. Asegúrate de tener Python 3.7 o superior instalado
2. Instala FFmpeg (necesario para procesar archivos de audio)
3. Instala Whisper con pip:

   pip install -U openai-whisper

Para más información, visita: https://github.com/openai/whisper
`;
}

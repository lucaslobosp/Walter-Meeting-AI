/**
 * Servicio para interactuar con la API de OpenAI
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Cargar variables de entorno
dotenv.config();

// Crear cliente de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Transcribe un archivo de audio usando la API de OpenAI
 * @param {string} audioFilePath - Ruta al archivo de audio
 * @returns {Promise<object>} - Transcripción generada
 */
export async function transcribeAudio(audioFilePath) {
  try {
    console.log('Transcribiendo audio con OpenAI...');
    console.log(`Archivo de audio: ${audioFilePath}`);
    console.log(`Clave API de OpenAI configurada: ${process.env.OPENAI_API_KEY ? 'Sí' : 'No'}`);
    console.log(`Longitud de la clave API: ${process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0}`);

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

    // Verificar la extensión del archivo
    const fileExtension = path.extname(audioFilePath).toLowerCase();
    console.log(`Extensión del archivo: ${fileExtension}`);

    // Crear un archivo temporal con la extensión correcta si es necesario
    let fileToUse = audioFilePath;
    if (fileExtension !== '.mp3' && fileExtension !== '.mp4' && fileExtension !== '.mpeg' &&
        fileExtension !== '.mpga' && fileExtension !== '.m4a' && fileExtension !== '.wav' &&
        fileExtension !== '.webm') {
      console.log('Formato de archivo no estándar, intentando procesar de todos modos...');
    }

    // Preparar el archivo para OpenAI
    console.log('Preparando archivo para OpenAI...');

    // Configurar el cliente de OpenAI con un timeout más largo
    const openaiWithTimeout = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 5 * 60 * 1000, // 5 minutos
      maxRetries: 3
    });

    // Llamar a la API de OpenAI para transcribir el audio
    console.log('Enviando solicitud a OpenAI...');
    console.log('Modelo: whisper-1, Idioma: es');

    const response = await openaiWithTimeout.audio.transcriptions.create({
      file: fs.createReadStream(fileToUse),
      model: 'whisper-1',
      language: 'es',
      response_format: 'verbose_json'
    });

    console.log('Transcripción completada con OpenAI');
    console.log('Respuesta recibida:', response);

    if (!response || !response.text) {
      throw new Error('La respuesta de OpenAI no contiene texto transcrito');
    }

    console.log(`Texto transcrito: ${response.text.substring(0, 100)}...`);

    // Guardar la transcripción en un archivo
    const transcriptionStoragePath = process.env.TRANSCRIPTION_STORAGE_PATH || './storage/transcriptions';
    if (!fs.existsSync(transcriptionStoragePath)) {
      fs.mkdirSync(transcriptionStoragePath, { recursive: true });
    }

    const audioFileName = path.basename(audioFilePath, path.extname(audioFilePath));
    const transcriptionFilePath = path.join(transcriptionStoragePath, `${audioFileName}_transcription.json`);

    // Guardar la transcripción completa
    fs.writeFileSync(transcriptionFilePath, JSON.stringify({
      text: response.text,
      segments: response.segments || [],
      timestamp: new Date().toISOString(),
      audioFile: path.basename(audioFilePath)
    }, null, 2));

    console.log(`Transcripción guardada en: ${transcriptionFilePath}`);

    // Formatear la respuesta
    return {
      text: response.text,
      segments: response.segments ? response.segments.map(segment => ({
        text: segment.text,
        start: segment.start,
        end: segment.end
      })) : [],
      filePath: transcriptionFilePath
    };
  } catch (error) {
    console.error('Error al transcribir audio con OpenAI:', error);
    console.error('Detalles del error:', error.message);
    if (error.response) {
      console.error('Respuesta de error de OpenAI:', error.response.data);
    }
    throw error;
  }
}

/**
 * Genera un resumen de un texto usando OpenAI
 * @param {string} text - Texto a resumir
 * @returns {Promise<object>} - Resumen generado
 */
export async function generateSummary(text) {
  try {
    console.log('Generando resumen con OpenAI...');

    const prompt = `
    Eres un asistente especializado en resumir reuniones de trabajo.
    A continuación se presenta la transcripción de una reunión.
    Por favor, genera un resumen estructurado que incluya:

    1. Un resumen ejecutivo (máximo 3 párrafos)
    2. Los puntos clave discutidos (formato lista)
    3. Las preguntas y respuestas importantes (formato Q&A)
    4. Los objetivos identificados (formato lista)

    Transcripción:
    ${text}

    Responde en formato JSON con la siguiente estructura:
    {
      "executive": "Resumen ejecutivo aquí",
      "keyPoints": ["Punto 1", "Punto 2", ...],
      "questionsAndAnswers": [{"question": "Pregunta 1", "answer": "Respuesta 1"}, ...],
      "objectives": ["Objetivo 1", "Objetivo 2", ...]
    }
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'Eres un asistente especializado en resumir reuniones de trabajo.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    });

    // Extraer y parsear la respuesta
    const content = response.choices[0].message.content;
    console.log('Resumen generado correctamente');

    return JSON.parse(content);
  } catch (error) {
    console.error('Error al generar resumen con OpenAI:', error);

    // Devolver un resumen simulado en caso de error
    return {
      executive: 'No se pudo generar un resumen debido a un error con OpenAI.',
      keyPoints: ['Error al conectar con OpenAI', 'Verifica tu clave API'],
      questionsAndAnswers: [],
      objectives: []
    };
  }
}

/**
 * Genera un análisis de un texto usando OpenAI
 * @param {string} text - Texto a analizar
 * @returns {Promise<object>} - Análisis generado
 */
export async function generateAnalysis(text) {
  try {
    console.log('Generando análisis con OpenAI...');

    const prompt = `
    Eres un asistente especializado en analizar reuniones de trabajo.
    A continuación se presenta la transcripción de una reunión.
    Por favor, genera un análisis estructurado que incluya:

    1. Los temas clave mencionados con su relevancia (0-1)
    2. El sentimiento general de la reunión (positivo, negativo o neutral) con una puntuación (-1 a 1)
    3. Las preguntas planteadas y sus respuestas
    4. Los objetivos identificados
    5. Las tareas mencionadas o implícitas

    Transcripción:
    ${text}

    Responde en formato JSON con la siguiente estructura:
    {
      "keyTopics": [{"term": "tema1", "tfidf": 0.8}, {"term": "tema2", "tfidf": 0.6}, ...],
      "sentiment": {"score": 0.5, "comparative": 0.1},
      "questions": [{"text": "Pregunta 1", "answer": "Respuesta 1"}, ...],
      "objectives": [{"text": "Objetivo 1"}, {"text": "Objetivo 2"}, ...],
      "tasks": [{"text": "Tarea 1"}, {"text": "Tarea 2"}, ...]
    }
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'Eres un asistente especializado en analizar reuniones de trabajo.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    });

    // Extraer y parsear la respuesta
    const content = response.choices[0].message.content;
    console.log('Análisis generado correctamente');

    return JSON.parse(content);
  } catch (error) {
    console.error('Error al generar análisis con OpenAI:', error);

    // Devolver un análisis simulado en caso de error
    return {
      keyTopics: [
        { term: 'error', tfidf: 0.9 },
        { term: 'openai', tfidf: 0.8 }
      ],
      sentiment: { score: 0, comparative: 0 },
      questions: [],
      objectives: [{ text: 'Verificar la conexión con OpenAI' }],
      tasks: [{ text: 'Revisar la clave API de OpenAI' }]
    };
  }
}

/**
 * Genera un plan basado en un texto usando OpenAI
 * @param {string} text - Texto base para el plan
 * @returns {Promise<object>} - Plan generado
 */
export async function generatePlan(text) {
  try {
    console.log('Generando plan con OpenAI...');

    const today = new Date();
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const prompt = `
    Eres un asistente especializado en planificación de proyectos.
    A continuación se presenta la transcripción de una reunión.
    Por favor, genera un plan de trabajo estructurado que incluya:

    1. Nombre y descripción del plan
    2. Fecha de inicio (hoy: ${today.toISOString().split('T')[0]})
    3. Fecha de fin (fin de mes: ${endOfMonth.toISOString().split('T')[0]})
    4. Objetivos identificados
    5. Tareas para cada objetivo con fechas estimadas

    Transcripción:
    ${text}

    Responde en formato JSON con la siguiente estructura:
    {
      "id": "plan-1",
      "name": "Nombre del Plan",
      "description": "Descripción del plan",
      "startDate": "${today.toISOString().split('T')[0]}",
      "endDate": "${endOfMonth.toISOString().split('T')[0]}",
      "objectives": [
        {"id": "obj1", "text": "Objetivo 1", "tasks": ["task1", "task2"]},
        {"id": "obj2", "text": "Objetivo 2", "tasks": ["task3"]}
      ],
      "unassignedTasks": [],
      "ganttData": {
        "tasks": [
          {"id": "task1", "text": "Tarea 1", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD", "progress": 0, "assignee": "Responsable"},
          {"id": "task2", "text": "Tarea 2", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD", "progress": 0, "assignee": "Responsable"}
        ],
        "dependencies": [
          {"id": "dep1", "source": "task1", "target": "task2", "type": 0}
        ]
      }
    }
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'Eres un asistente especializado en planificación de proyectos.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    });

    // Extraer y parsear la respuesta
    const content = response.choices[0].message.content;
    console.log('Plan generado correctamente');

    return JSON.parse(content);
  } catch (error) {
    console.error('Error al generar plan con OpenAI:', error);

    // Devolver un plan simulado en caso de error
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    return {
      id: 'plan-error',
      name: 'Plan de Contingencia',
      description: 'Plan generado debido a un error con OpenAI',
      startDate: today.toISOString().split('T')[0],
      endDate: endOfMonth.toISOString().split('T')[0],
      objectives: [
        {
          id: 'obj1',
          text: 'Verificar la conexión con OpenAI',
          tasks: ['task1']
        }
      ],
      unassignedTasks: [],
      ganttData: {
        tasks: [
          {
            id: 'task1',
            text: 'Revisar la clave API de OpenAI',
            start_date: today.toISOString().split('T')[0],
            end_date: nextWeek.toISOString().split('T')[0],
            progress: 0,
            assignee: 'Administrador'
          }
        ],
        dependencies: []
      }
    };
  }
}

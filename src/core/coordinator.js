/**
 * Coordinador de Agentes
 *
 * Este módulo coordina la comunicación y el flujo de trabajo entre los diferentes agentes.
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import TranscriberAgent from '../agents/transcriber/index.js';
import AnalyzerAgent from '../agents/analyzer/index.js';
import SummarizerAgent from '../agents/summarizer/index.js';
import TrackerAgent from '../agents/tracker/index.js';
import PlannerAgent from '../agents/planner/index.js';

class Coordinator extends EventEmitter {
  constructor(options = {}) {
    super();

    // Inicializar agentes
    this.transcriber = new TranscriberAgent(options.transcriber || {});
    this.analyzer = new AnalyzerAgent(options.analyzer || {});
    this.summarizer = new SummarizerAgent(options.summarizer || {});
    this.tracker = new TrackerAgent(options.tracker || {});
    this.planner = new PlannerAgent(options.planner || {});

    // Almacenar resultados de procesamiento
    this.results = new Map();
  }

  /**
   * Procesa un archivo de audio de reunión
   * @param {string} audioFilePath - Ruta al archivo de audio
   * @returns {Promise<object>} - Resultado del procesamiento
   */
  async processMeeting(audioFilePath) {
    try {
      console.log('Iniciando procesamiento de reunión:', audioFilePath);

      // Verificar que el archivo existe
      if (!fs.existsSync(audioFilePath)) {
        throw new Error(`El archivo de audio no existe: ${audioFilePath}`);
      }

      const meetingId = uuidv4();
      console.log('ID de reunión generado:', meetingId);

      const result = {
        meetingId,
        status: 'processing',
        timestamp: new Date().toISOString(),
        steps: {}
      };

      this.results.set(meetingId, result);
      this.emit('processing:start', { meetingId });

      // Paso 1: Transcripción
      console.log('Iniciando transcripción...');
      this.emit('processing:transcription:start', { meetingId });

      try {
        console.log('Llamando al agente de transcripción con:', audioFilePath);
        const transcriptionResult = await this.transcriber.transcribe(audioFilePath);
        console.log('Estado de transcripción:', transcriptionResult.success ? 'Exitoso' : 'Fallido');

        if (transcriptionResult.transcription && transcriptionResult.transcription.text) {
          console.log('Texto transcrito (primeros 100 caracteres):', transcriptionResult.transcription.text.substring(0, 100));

          // Guardar la ruta del archivo de transcripción si está disponible
          if (transcriptionResult.transcription.filePath) {
            console.log('Archivo de transcripción guardado en:', transcriptionResult.transcription.filePath);
          }
        } else {
          console.warn('No se encontró texto en la transcripción');
        }

        result.steps.transcription = transcriptionResult;
        this.emit('processing:transcription:complete', { meetingId, result: transcriptionResult });

        if (!transcriptionResult.success) {
          console.error('Error en la transcripción:', transcriptionResult.error);
          result.status = 'failed';
          result.error = `Falló la transcripción: ${transcriptionResult.error}`;
          this.results.set(meetingId, result);
          this.emit('processing:failed', { meetingId, error: result.error });
          return result;
        }
      } catch (transcriptionError) {
        console.error('Excepción durante la transcripción:', transcriptionError);
        console.error('Detalles del error:', transcriptionError.message);
        console.error('Stack trace:', transcriptionError.stack);

        result.status = 'failed';
        result.error = `Excepción durante la transcripción: ${transcriptionError.message}`;
        result.steps.transcription = {
          success: false,
          error: transcriptionError.message,
          metadata: {
            audioFile: path.basename(audioFilePath),
            timestamp: new Date().toISOString()
          }
        };
        this.results.set(meetingId, result);
        this.emit('processing:failed', { meetingId, error: result.error });
        return result;
      }

      // Paso 2: Análisis
      this.emit('processing:analysis:start', { meetingId });
      try {
        // Obtener el resultado de la transcripción del objeto result
        const transcription = result.steps.transcription.transcription;
        console.log('Iniciando análisis con transcripción...');

        if (!transcription || !transcription.text) {
          throw new Error('No hay texto en la transcripción para analizar');
        }

        const analysisResult = await this.analyzer.analyze(transcription);
        result.steps.analysis = analysisResult;
        this.emit('processing:analysis:complete', { meetingId, result: analysisResult });
      } catch (analysisError) {
        console.error('Error durante el análisis:', analysisError);
        result.steps.analysis = {
          success: false,
          error: analysisError.message,
          metadata: {
            timestamp: new Date().toISOString()
          }
        };
        result.status = 'failed';
        result.error = `Falló el análisis: ${analysisError.message}`;
        this.results.set(meetingId, result);
        this.emit('processing:failed', { meetingId, error: result.error });
        return result;
      }

      // Verificar si el análisis fue exitoso
      if (!result.steps.analysis || !result.steps.analysis.success) {
        // Si ya se estableció un error en el try/catch, no sobrescribir
        if (result.status !== 'failed') {
          result.status = 'failed';
          result.error = 'Falló el análisis';
          this.results.set(meetingId, result);
          this.emit('processing:failed', { meetingId, error: result.error });
        }
        return result;
      }

      // Paso 3: Resumen
      this.emit('processing:summary:start', { meetingId });
      try {
        const transcription = result.steps.transcription.transcription;
        const analysis = result.steps.analysis.analysis;

        console.log('Iniciando generación de resumen...');
        const summaryResult = await this.summarizer.summarize(transcription, analysis);
        result.steps.summary = summaryResult;
        this.emit('processing:summary:complete', { meetingId, result: summaryResult });
      } catch (summaryError) {
        console.error('Error durante la generación del resumen:', summaryError);
        result.steps.summary = {
          success: false,
          error: summaryError.message,
          metadata: {
            timestamp: new Date().toISOString()
          }
        };
        // No fallamos todo el proceso por un error en el resumen
        this.emit('processing:summary:complete', {
          meetingId,
          result: result.steps.summary,
          error: summaryError.message
        });
      }

      // Paso 4: Seguimiento
      this.emit('processing:tracking:start', { meetingId });
      try {
        const analysis = result.steps.analysis.analysis;

        console.log('Iniciando seguimiento de objetivos y tareas...');
        const trackingResult = await this.tracker.trackMeeting(analysis, meetingId);
        result.steps.tracking = trackingResult;
        this.emit('processing:tracking:complete', { meetingId, result: trackingResult });
      } catch (trackingError) {
        console.error('Error durante el seguimiento:', trackingError);
        result.steps.tracking = {
          success: false,
          error: trackingError.message,
          tracking: {
            objectives: [],
            tasks: []
          },
          metadata: {
            timestamp: new Date().toISOString(),
            meetingId
          }
        };
        // No fallamos todo el proceso por un error en el seguimiento
        this.emit('processing:tracking:complete', {
          meetingId,
          result: result.steps.tracking,
          error: trackingError.message
        });
      }

      // Paso 5: Planificación
      this.emit('processing:planning:start', { meetingId });
      try {
        // Obtener datos necesarios para la planificación
        const transcriptionText = result.steps.transcription.transcription.text;
        const objectives = result.steps.tracking.success ? result.steps.tracking.tracking.objectives : [];
        const tasks = result.steps.tracking.success ? result.steps.tracking.tracking.tasks : [];

        console.log('Iniciando generación de plan...');
        console.log(`Objetivos identificados: ${objectives.length}`);
        console.log(`Tareas identificadas: ${tasks.length}`);

        const planningResult = await this.planner.createPlan(
          objectives,
          tasks,
          transcriptionText // Pasar el texto de la transcripción
        );
        result.steps.planning = planningResult;
        this.emit('processing:planning:complete', { meetingId, result: planningResult });
      } catch (planningError) {
        console.error('Error durante la planificación:', planningError);
        result.steps.planning = {
          success: false,
          error: planningError.message,
          plan: {
            id: `plan-error-${meetingId}`,
            name: 'Plan de Contingencia',
            description: 'Plan generado debido a un error en la planificación',
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
            objectives: [],
            unassignedTasks: [],
            ganttData: { tasks: [], dependencies: [] }
          },
          metadata: {
            timestamp: new Date().toISOString(),
            service: 'error-fallback'
          }
        };
        // No fallamos todo el proceso por un error en la planificación
        this.emit('processing:planning:complete', {
          meetingId,
          result: result.steps.planning,
          error: planningError.message
        });
      }

      // Finalizar procesamiento
      result.status = 'completed';
      this.results.set(meetingId, result);
      this.emit('processing:complete', { meetingId, result });

      return result;
    } catch (error) {
      console.error('Error en el procesamiento de la reunión:', error);

      const errorResult = {
        meetingId: uuidv4(),
        status: 'failed',
        timestamp: new Date().toISOString(),
        error: error.message
      };

      this.results.set(errorResult.meetingId, errorResult);
      this.emit('processing:failed', { meetingId: errorResult.meetingId, error: error.message });

      return errorResult;
    }
  }

  /**
   * Obtiene el resultado de una reunión por su ID
   * @param {string} meetingId - ID de la reunión
   * @returns {object} - Resultado del procesamiento
   */
  getMeetingResult(meetingId) {
    if (!this.results.has(meetingId)) {
      throw new Error(`Resultado no encontrado para la reunión: ${meetingId}`);
    }

    return this.results.get(meetingId);
  }

  /**
   * Obtiene todos los resultados de reuniones
   * @returns {Array} - Lista de resultados
   */
  getAllMeetingResults() {
    return Array.from(this.results.values());
  }
}

export default Coordinator;

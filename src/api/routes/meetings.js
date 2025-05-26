/**
 * Rutas para gestión de reuniones
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Importar coordinador de agentes
import Coordinator from '../../core/coordinator.js';

// Crear router
const router = express.Router();

// Referencia al coordinador (se debe inicializar en el archivo principal)
let coordinator;

// Configurar almacenamiento para archivos de audio
const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.AUDIO_STORAGE_PATH || './storage/audio';

    // Crear directorio si no existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const originalName = file.originalname;
    const extension = path.extname(originalName);
    const fileName = `audio_${timestamp}${extension}`;
    cb(null, fileName);
  }
});

const upload = multer({
  storage: audioStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
  },
  fileFilter: (req, file, cb) => {
    // Validar tipo de archivo
    const allowedMimes = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no válido. Solo se permiten archivos de audio.'));
    }
  }
});

// Inicializar router con coordinador
export function initRouter(coordinatorInstance) {
  if (!coordinatorInstance) {
    throw new Error('Se requiere una instancia del coordinador para inicializar el router');
  }
  coordinator = coordinatorInstance;
  console.log('Router de reuniones inicializado con coordinador');
  return router;
}

// Ruta para listar todas las reuniones
router.get('/', (req, res) => {
  try {
    const meetings = coordinator.getAllMeetingResults();

    // Filtrar información sensible
    const filteredMeetings = meetings.map(meeting => ({
      meetingId: meeting.meetingId,
      status: meeting.status,
      timestamp: meeting.timestamp,
      hasTranscription: meeting.steps && meeting.steps.transcription && meeting.steps.transcription.success,
      hasAnalysis: meeting.steps && meeting.steps.analysis && meeting.steps.analysis.success,
      hasSummary: meeting.steps && meeting.steps.summary && meeting.steps.summary.success,
      hasTracking: meeting.steps && meeting.steps.tracking && meeting.steps.tracking.success,
      hasPlanning: meeting.steps && meeting.steps.planning && meeting.steps.planning.success
    }));

    res.json({
      success: true,
      meetings: filteredMeetings
    });
  } catch (error) {
    console.error('Error al listar reuniones:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Ruta para subir archivo de audio
router.post('/upload', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionó ningún archivo de audio'
      });
    }

    // Información del archivo
    const audioFile = {
      path: req.file.path,
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    };

    // Iniciar procesamiento y obtener el resultado con el ID de la reunión
    const result = await coordinator.processMeeting(audioFile.path);
    const meetingId = result.meetingId;

    console.log(`Procesamiento iniciado para reunión: ${meetingId}`);
    console.log(`Estado actual: ${result.status}`);

    res.status(202).json({
      success: true,
      message: 'Archivo de audio recibido. Procesamiento iniciado.',
      meetingId,
      audioFile,
      status: result.status
    });
  } catch (error) {
    console.error('Error al procesar archivo de audio:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Ruta para obtener estado de procesamiento
router.get('/:meetingId/status', (req, res) => {
  try {
    const { meetingId } = req.params;

    if (!coordinator.results.has(meetingId)) {
      return res.status(404).json({
        success: false,
        error: 'Reunión no encontrada'
      });
    }

    const result = coordinator.getMeetingResult(meetingId);

    res.json({
      success: true,
      meetingId,
      status: result.status,
      timestamp: result.timestamp
    });
  } catch (error) {
    console.error('Error al obtener estado de la reunión:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Ruta para obtener detalles de una reunión
router.get('/:meetingId', (req, res) => {
  try {
    const { meetingId } = req.params;

    if (!coordinator.results.has(meetingId)) {
      return res.status(404).json({
        success: false,
        error: 'Reunión no encontrada'
      });
    }

    const result = coordinator.getMeetingResult(meetingId);

    // Si aún está en procesamiento, devolver solo el estado
    if (result.status === 'processing') {
      return res.json({
        success: true,
        meetingId,
        status: result.status,
        timestamp: result.timestamp,
        message: 'La reunión aún está siendo procesada'
      });
    }

    // Si falló, devolver el error
    if (result.status === 'failed') {
      return res.json({
        success: false,
        meetingId,
        status: result.status,
        timestamp: result.timestamp,
        error: result.error
      });
    }

    // Si está completo, devolver los resultados
    res.json({
      success: true,
      meetingId,
      status: result.status,
      timestamp: result.timestamp,
      transcription: result.steps.transcription.success ? true : false, // No enviar transcripción completa
      analysis: result.steps.analysis.success ? result.steps.analysis.analysis : null,
      summary: result.steps.summary.success ? result.steps.summary.summary : null,
      tracking: result.steps.tracking.success ? result.steps.tracking.tracking : null,
      planning: result.steps.planning.success ? result.steps.planning.plan : null
    });
  } catch (error) {
    console.error('Error al obtener resultados de la reunión:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Ruta para obtener transcripción
router.get('/:meetingId/transcription', (req, res) => {
  try {
    const { meetingId } = req.params;

    if (!coordinator.results.has(meetingId)) {
      return res.status(404).json({
        success: false,
        error: 'Reunión no encontrada'
      });
    }

    const result = coordinator.getMeetingResult(meetingId);

    // Verificar si la transcripción está disponible
    if (!result.steps.transcription || !result.steps.transcription.success) {
      return res.status(404).json({
        success: false,
        error: 'Transcripción no disponible'
      });
    }

    res.json({
      success: true,
      meetingId,
      transcription: result.steps.transcription.transcription,
      metadata: result.steps.transcription.metadata
    });
  } catch (error) {
    console.error('Error al obtener transcripción:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Ruta para obtener análisis
router.get('/:meetingId/analysis', (req, res) => {
  try {
    const { meetingId } = req.params;

    if (!coordinator.results.has(meetingId)) {
      return res.status(404).json({
        success: false,
        error: 'Reunión no encontrada'
      });
    }

    const result = coordinator.getMeetingResult(meetingId);

    // Verificar si el análisis está disponible
    if (!result.steps.analysis || !result.steps.analysis.success) {
      return res.status(404).json({
        success: false,
        error: 'Análisis no disponible'
      });
    }

    res.json({
      success: true,
      meetingId,
      analysis: result.steps.analysis.analysis,
      metadata: result.steps.analysis.metadata
    });
  } catch (error) {
    console.error('Error al obtener análisis:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Ruta para obtener resumen
router.get('/:meetingId/summary', (req, res) => {
  try {
    const { meetingId } = req.params;

    if (!coordinator.results.has(meetingId)) {
      return res.status(404).json({
        success: false,
        error: 'Reunión no encontrada'
      });
    }

    const result = coordinator.getMeetingResult(meetingId);

    // Verificar si el resumen está disponible
    if (!result.steps.summary || !result.steps.summary.success) {
      return res.status(404).json({
        success: false,
        error: 'Resumen no disponible'
      });
    }

    res.json({
      success: true,
      meetingId,
      summary: result.steps.summary.summary,
      metadata: result.steps.summary.metadata
    });
  } catch (error) {
    console.error('Error al obtener resumen:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Ruta para obtener seguimiento
router.get('/:meetingId/tracking', (req, res) => {
  try {
    const { meetingId } = req.params;

    if (!coordinator.results.has(meetingId)) {
      return res.status(404).json({
        success: false,
        error: 'Reunión no encontrada'
      });
    }

    const result = coordinator.getMeetingResult(meetingId);

    // Verificar si el seguimiento está disponible
    if (!result.steps.tracking || !result.steps.tracking.success) {
      return res.status(404).json({
        success: false,
        error: 'Seguimiento no disponible'
      });
    }

    res.json({
      success: true,
      meetingId,
      tracking: result.steps.tracking.tracking,
      metadata: result.steps.tracking.metadata
    });
  } catch (error) {
    console.error('Error al obtener seguimiento:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Ruta para obtener plan
router.get('/:meetingId/plan', (req, res) => {
  try {
    const { meetingId } = req.params;

    if (!coordinator.results.has(meetingId)) {
      return res.status(404).json({
        success: false,
        error: 'Reunión no encontrada'
      });
    }

    const result = coordinator.getMeetingResult(meetingId);

    // Verificar si el plan está disponible
    if (!result.steps.planning || !result.steps.planning.success) {
      return res.status(404).json({
        success: false,
        error: 'Plan no disponible'
      });
    }

    res.json({
      success: true,
      meetingId,
      plan: result.steps.planning.plan,
      metadata: result.steps.planning.metadata
    });
  } catch (error) {
    console.error('Error al obtener plan:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

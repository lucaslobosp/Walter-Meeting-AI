/**
 * API REST para el sistema de agentes
 */

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import Coordinator from '../core/coordinator.js';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, BorderStyle } from 'docx';

// Cargar variables de entorno
dotenv.config();

// Obtener directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar almacenamiento para archivos de audio
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const audioPath = process.env.AUDIO_STORAGE_PATH || './storage/audio';

    // Crear directorio si no existe
    if (!fs.existsSync(audioPath)) {
      fs.mkdirSync(audioPath, { recursive: true });
    }

    cb(null, audioPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now();
    cb(null, `audio_${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB límite
  },
  fileFilter: (req, file, cb) => {
    // Verificar tipo de archivo
    if (file.mimetype.startsWith('audio/') ||
        file.mimetype === 'application/octet-stream') {
      cb(null, true);
    } else {
      cb(new Error('Formato de archivo no soportado. Solo se permiten archivos de audio.'));
    }
  }
});

// Crear aplicación Express
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, '../..')));

// Crear coordinador con opciones
const coordinator = new Coordinator({
  transcriber: {
    useWhisperCLI: false,  // Preferir OpenAI API
    useWhisper: true,      // Fallback a Whisper local
    useGoogleSpeech: false // No usar Google Speech
  }
});

// Importar rutas
import { initRouter as initMeetingsRouter } from './routes/meetings.js';

// Rutas API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    openaiConfigured: process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 0
  });
});

// Inicializar y montar rutas
app.use('/api/meetings', initMeetingsRouter(coordinator));

// Ruta para subir archivo de audio
app.post('/api/upload', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se ha proporcionado ningún archivo'
      });
    }

    console.log('Archivo recibido:', req.file);

    // Iniciar procesamiento en segundo plano
    const audioFilePath = req.file.path;
    const meetingId = uuidv4();

    // Responder inmediatamente con el ID de la reunión
    res.json({
      success: true,
      meetingId,
      message: 'Archivo recibido correctamente. Procesamiento iniciado.',
      filename: req.file.filename
    });

    // Iniciar procesamiento en segundo plano
    console.log('Iniciando procesamiento del archivo:', audioFilePath);
    coordinator.processMeeting(audioFilePath)
      .then(result => {
        console.log(`Procesando reunión con ID: ${result.meetingId}`);
      })
      .catch(error => {
        console.error('Error al procesar el archivo:', error);
      });
  } catch (error) {
    console.error('Error al subir archivo:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Ruta para listar reuniones
app.get('/api/meetings', (req, res) => {
  try {
    const meetings = coordinator.getAllMeetingResults();

    // Formatear resultados para la respuesta
    const formattedMeetings = meetings.map(meeting => ({
      meetingId: meeting.meetingId,
      status: meeting.status,
      timestamp: meeting.timestamp,
      hasTranscription: meeting.steps && meeting.steps.transcription && meeting.steps.transcription.success,
      hasAnalysis: meeting.steps && meeting.steps.analysis && meeting.steps.analysis.success,
      hasSummary: meeting.steps && meeting.steps.summary && meeting.steps.summary.success,
      hasPlanning: meeting.steps && meeting.steps.planning && meeting.steps.planning.success
    }));

    res.json({
      success: true,
      meetings: formattedMeetings
    });
  } catch (error) {
    console.error('Error al listar reuniones:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Ruta para obtener detalles de una reunión
app.get('/api/meetings/:meetingId', (req, res) => {
  try {
    const { meetingId } = req.params;
    console.log(`Solicitando detalles de la reunión: ${meetingId}`);

    if (!coordinator.results.has(meetingId)) {
      console.log(`Reunión no encontrada: ${meetingId}`);
      return res.status(404).json({
        success: false,
        error: 'Reunión no encontrada'
      });
    }

    const result = coordinator.getMeetingResult(meetingId);
    console.log(`Estado de la reunión ${meetingId}: ${result.status}`);

    // Verificar si la transcripción está en proceso
    if (result.status === 'processing') {
      // Verificar si la transcripción está completa
      if (result.steps && result.steps.transcription && result.steps.transcription.success) {
        console.log(`La transcripción para la reunión ${meetingId} está completa, pero el procesamiento continúa`);
      } else {
        console.log(`La reunión ${meetingId} aún está en procesamiento`);
      }
    }

    res.json({
      success: true,
      meetingId,
      status: result.status,
      timestamp: result.timestamp
    });

    if (result.status === 'completed') {
      console.log(`La reunión ${meetingId} se procesó correctamente`);
      if (!result.steps || Object.keys(result.steps).length === 0) {
        console.log(`Advertencia: La reunión ${meetingId} no tiene pasos completos`);
      }
    } else if (result.status === 'failed') {
      console.log(`La reunión ${meetingId} falló: ${result.error}`);
    }
  } catch (error) {
    console.error('Error al obtener detalles de la reunión:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Ruta para obtener transcripción
app.get('/api/meetings/:meetingId/transcription', (req, res) => {
  try {
    const { meetingId } = req.params;
    console.log(`Solicitando transcripción de la reunión: ${meetingId}`);

    if (!coordinator.results.has(meetingId)) {
      console.log(`Reunión no encontrada: ${meetingId}`);
      return res.status(404).json({
        success: false,
        error: 'Reunión no encontrada'
      });
    }

    const result = coordinator.getMeetingResult(meetingId);

    // Verificar si la transcripción está disponible
    if (!result.steps.transcription || !result.steps.transcription.success) {
      console.log(`Transcripción no disponible para la reunión ${meetingId}, esperando procesamiento`);

      // Devolver mensaje de espera
      return res.json({
        success: false,
        meetingId,
        message: 'La transcripción está en proceso. Por favor, intente nuevamente en unos momentos.',
        status: result.status
      });
    }

    console.log(`Devolviendo transcripción para la reunión ${meetingId}`);
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
app.get('/api/meetings/:meetingId/analysis', (req, res) => {
  try {
    const { meetingId } = req.params;
    console.log(`Solicitando análisis de la reunión: ${meetingId}`);

    if (!coordinator.results.has(meetingId)) {
      console.log(`Reunión no encontrada: ${meetingId}`);
      return res.status(404).json({
        success: false,
        error: 'Reunión no encontrada'
      });
    }

    const result = coordinator.getMeetingResult(meetingId);

    // Verificar si el análisis está disponible
    if (!result.steps.analysis || !result.steps.analysis.success) {
      console.log(`Análisis no disponible para la reunión ${meetingId}, esperando procesamiento`);

      // Devolver mensaje de espera
      return res.json({
        success: false,
        meetingId,
        message: 'El análisis está en proceso. Por favor, intente nuevamente en unos momentos.',
        status: result.status
      });
    }

    console.log(`Devolviendo análisis para la reunión ${meetingId}`);
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
app.get('/api/meetings/:meetingId/summary', (req, res) => {
  try {
    const { meetingId } = req.params;
    console.log(`Solicitando resumen de la reunión: ${meetingId}`);

    if (!coordinator.results.has(meetingId)) {
      console.log(`Reunión no encontrada: ${meetingId}`);
      return res.status(404).json({
        success: false,
        error: 'Reunión no encontrada'
      });
    }

    const result = coordinator.getMeetingResult(meetingId);

    // Verificar si el resumen está disponible
    if (!result.steps.summary || !result.steps.summary.success) {
      console.log(`Resumen no disponible para la reunión ${meetingId}, esperando procesamiento`);

      // Devolver mensaje de espera
      return res.json({
        success: false,
        meetingId,
        message: 'El resumen está en proceso. Por favor, intente nuevamente en unos momentos.',
        status: result.status
      });
    }

    console.log(`Devolviendo resumen para la reunión ${meetingId}`);
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

// Ruta para obtener plan
app.get('/api/meetings/:meetingId/plan', (req, res) => {
  try {
    const { meetingId } = req.params;
    console.log(`Solicitando plan de la reunión: ${meetingId}`);

    if (!coordinator.results.has(meetingId)) {
      console.log(`Reunión no encontrada: ${meetingId}`);
      return res.status(404).json({
        success: false,
        error: 'Reunión no encontrada'
      });
    }

    const result = coordinator.getMeetingResult(meetingId);

    // Verificar si el plan está disponible
    if (!result.steps.planning || !result.steps.planning.success) {
      console.log(`Plan no disponible para la reunión ${meetingId}, esperando procesamiento`);

      // Devolver mensaje de espera
      return res.json({
        success: false,
        meetingId,
        message: 'El plan está en proceso. Por favor, intente nuevamente en unos momentos.',
        status: result.status
      });
    }

    console.log(`Devolviendo plan para la reunión ${meetingId}`);
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

// Ruta para obtener tracking
app.get('/api/meetings/:meetingId/tracking', (req, res) => {
  try {
    const { meetingId } = req.params;
    console.log(`Solicitando tracking de la reunión: ${meetingId}`);

    if (!coordinator.results.has(meetingId)) {
      console.log(`Reunión no encontrada: ${meetingId}`);
      return res.status(404).json({
        success: false,
        error: 'Reunión no encontrada'
      });
    }

    const result = coordinator.getMeetingResult(meetingId);

    // Verificar si el tracking está disponible
    if (!result.steps.tracking || !result.steps.tracking.success) {
      console.log(`Tracking no disponible para la reunión ${meetingId}, esperando procesamiento`);

      // Devolver mensaje de espera
      return res.json({
        success: false,
        meetingId,
        message: 'El tracking está en proceso. Por favor, intente nuevamente en unos momentos.',
        status: result.status
      });
    }

    console.log(`Devolviendo tracking para la reunión ${meetingId}`);
    res.json({
      success: true,
      meetingId,
      tracking: result.steps.tracking.tracking,
      metadata: result.steps.tracking.metadata
    });
  } catch (error) {
    console.error('Error al obtener tracking:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Ruta para generar y descargar informe en Word
app.get('/api/meetings/:meetingId/report', async (req, res) => {
  try {
    const { meetingId } = req.params;
    console.log(`Generando informe Word para la reunión: ${meetingId}`);

    if (!coordinator.results.has(meetingId)) {
      console.log(`Reunión no encontrada: ${meetingId}`);
      return res.status(404).json({
        success: false,
        error: 'Reunión no encontrada'
      });
    }

    const result = coordinator.getMeetingResult(meetingId);

    // Verificar si la reunión está completamente procesada
    if (result.status !== 'completed') {
      console.log(`La reunión ${meetingId} no está completamente procesada, estado actual: ${result.status}`);
      return res.status(400).json({
        success: false,
        error: 'La reunión aún no ha sido completamente procesada'
      });
    }

    // Función auxiliar para formatear objetos complejos
    const formatComplexObject = (obj, level = 0) => {
      const elements = [];

      if (typeof obj === 'string') {
        return obj;
      }

      if (typeof obj === 'number') {
        return obj.toString();
      }

      if (Array.isArray(obj)) {
        return obj.map(item => {
          if (typeof item === 'object' && item !== null) {
            if (item.text) return item.text;
            if (item.title) return item.title;
            if (item.name) return item.name;
            if (item.description) return item.description;
            return Object.values(item).filter(v => typeof v === 'string').join(' - ');
          }
          return String(item);
        }).join('\n• ');
      }

      if (typeof obj === 'object' && obj !== null) {
        const result = [];
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === 'string' || typeof value === 'number') {
            result.push(`${key}: ${value}`);
          } else if (Array.isArray(value)) {
            const formattedArray = value.map(item => {
              if (typeof item === 'object' && item !== null) {
                if (item.text) return item.text;
                if (item.title) return item.title;
                if (item.name) return item.name;
                if (item.description) return item.description;
                return Object.values(item).filter(v => typeof v === 'string').join(' - ');
              }
              return String(item);
            }).join(', ');
            result.push(`${key}: ${formattedArray}`);
          } else if (typeof value === 'object' && value !== null) {
            result.push(`${key}: ${formatComplexObject(value, level + 1)}`);
          }
        }
        return result.join('\n');
      }

      return String(obj);
    };

    // Elementos del documento
    const children = [];

    // Título
    children.push(
      new Paragraph({
        text: "Informe Completo de Reunión",
        heading: HeadingLevel.TITLE,
        alignment: "center",
      })
    );

    // Información general
    children.push(
      new Paragraph({
        text: `ID de Reunión: ${meetingId}`,
        heading: HeadingLevel.HEADING_1,
      })
    );

    children.push(
      new Paragraph({
        text: `Fecha: ${new Date(result.timestamp).toLocaleDateString()}`,
      })
    );

    // Sección de Transcripción
    if (result.steps.transcription && result.steps.transcription.success) {
      children.push(
        new Paragraph({
          text: "Transcripción",
          heading: HeadingLevel.HEADING_1,
          pageBreakBefore: true,
        })
      );

      const transcriptionText = result.steps.transcription.transcription?.text ||
                               result.steps.transcription.transcription ||
                               'No hay transcripción disponible';

      children.push(
        new Paragraph({
          text: String(transcriptionText),
        })
      );
    }

    // Sección de Resumen
    if (result.steps.summary && result.steps.summary.success) {
      children.push(
        new Paragraph({
          text: "Resumen Ejecutivo",
          heading: HeadingLevel.HEADING_1,
          pageBreakBefore: true,
        })
      );

      const summaryContent = result.steps.summary.summary || 'No hay resumen disponible';

      if (typeof summaryContent === 'object' && summaryContent !== null) {
        const formattedSummary = formatComplexObject(summaryContent);
        children.push(
          new Paragraph({
            text: formattedSummary,
          })
        );
      } else {
        children.push(
          new Paragraph({
            text: String(summaryContent),
          })
        );
      }
    }

    // Sección de Análisis
    if (result.steps.analysis && result.steps.analysis.success) {
      children.push(
        new Paragraph({
          text: "Análisis Detallado",
          heading: HeadingLevel.HEADING_1,
          pageBreakBefore: true,
        })
      );

      const analysisContent = result.steps.analysis.analysis || 'No hay análisis disponible';

      if (typeof analysisContent === 'object' && analysisContent !== null) {
        // Temas Clave
        if (analysisContent.keyTopics) {
          children.push(
            new Paragraph({
              text: "Temas Clave",
              heading: HeadingLevel.HEADING_2,
            })
          );

          if (Array.isArray(analysisContent.keyTopics)) {
            analysisContent.keyTopics.forEach(topic => {
              const topicText = formatComplexObject(topic);
              children.push(
                new Paragraph({
                  text: `• ${topicText}`,
                })
              );
            });
          }
        }

        // Análisis de Sentimiento
        if (analysisContent.sentiment) {
          children.push(
            new Paragraph({
              text: "Análisis de Sentimiento",
              heading: HeadingLevel.HEADING_2,
            })
          );

          const sentiment = analysisContent.sentiment;
          if (sentiment.score !== undefined) {
            children.push(
              new Paragraph({
                text: `Puntuación de Sentimiento: ${sentiment.score} (${sentiment.score > 0.5 ? 'Positivo' : sentiment.score < -0.5 ? 'Negativo' : 'Neutral'})`,
              })
            );
          }
          if (sentiment.comparative !== undefined) {
            children.push(
              new Paragraph({
                text: `Valor Comparativo: ${sentiment.comparative}`,
              })
            );
          }
        }

        // Preguntas Identificadas
        if (analysisContent.questions) {
          children.push(
            new Paragraph({
              text: "Preguntas Identificadas",
              heading: HeadingLevel.HEADING_2,
            })
          );

          if (Array.isArray(analysisContent.questions)) {
            analysisContent.questions.forEach(question => {
              const questionText = formatComplexObject(question);
              children.push(
                new Paragraph({
                  text: `• ${questionText}`,
                })
              );
            });
          }
        }

        // Objetivos Identificados
        if (analysisContent.objectives) {
          children.push(
            new Paragraph({
              text: "Objetivos Identificados",
              heading: HeadingLevel.HEADING_2,
            })
          );

          if (Array.isArray(analysisContent.objectives)) {
            analysisContent.objectives.forEach(objective => {
              const objectiveText = formatComplexObject(objective);
              children.push(
                new Paragraph({
                  text: `• ${objectiveText}`,
                })
              );
            });
          }
        }

        // Tareas Identificadas
        if (analysisContent.tasks) {
          children.push(
            new Paragraph({
              text: "Tareas Identificadas",
              heading: HeadingLevel.HEADING_2,
            })
          );

          if (Array.isArray(analysisContent.tasks)) {
            analysisContent.tasks.forEach(task => {
              const taskText = formatComplexObject(task);
              children.push(
                new Paragraph({
                  text: `• ${taskText}`,
                })
              );
            });
          }
        }
      } else {
        children.push(
          new Paragraph({
            text: String(analysisContent),
          })
        );
      }
    }

    // Sección de Plan
    if (result.steps.planning && result.steps.planning.success) {
      children.push(
        new Paragraph({
          text: "Plan de Acción Estratégico",
          heading: HeadingLevel.HEADING_1,
          pageBreakBefore: true,
        })
      );

      const planContent = result.steps.planning.plan || 'No hay plan disponible';

      if (typeof planContent === 'object' && planContent !== null) {
        // Información general del plan
        if (planContent.name) {
          children.push(
            new Paragraph({
              text: "Nombre del Plan",
              heading: HeadingLevel.HEADING_2,
            })
          );
          children.push(
            new Paragraph({
              text: String(planContent.name),
            })
          );
        }

        if (planContent.description) {
          children.push(
            new Paragraph({
              text: "Descripción",
              heading: HeadingLevel.HEADING_2,
            })
          );
          children.push(
            new Paragraph({
              text: String(planContent.description),
            })
          );
        }

        // Fechas del plan
        if (planContent.startDate || planContent.endDate) {
          children.push(
            new Paragraph({
              text: "Cronograma",
              heading: HeadingLevel.HEADING_2,
            })
          );

          if (planContent.startDate) {
            children.push(
              new Paragraph({
                text: `Fecha de Inicio: ${planContent.startDate}`,
              })
            );
          }

          if (planContent.endDate) {
            children.push(
              new Paragraph({
                text: `Fecha de Finalización: ${planContent.endDate}`,
              })
            );
          }
        }

        // Objetivos del plan
        if (planContent.objectives) {
          children.push(
            new Paragraph({
              text: "Objetivos del Plan",
              heading: HeadingLevel.HEADING_2,
            })
          );

          if (Array.isArray(planContent.objectives)) {
            planContent.objectives.forEach(objective => {
              const objectiveText = formatComplexObject(objective);
              children.push(
                new Paragraph({
                  text: `• ${objectiveText}`,
                })
              );
            });
          }
        }

        // Tareas del plan
        if (planContent.ganttData && planContent.ganttData.tasks) {
          children.push(
            new Paragraph({
              text: "Tareas Programadas",
              heading: HeadingLevel.HEADING_2,
            })
          );

          if (Array.isArray(planContent.ganttData.tasks)) {
            planContent.ganttData.tasks.forEach((task, index) => {
              children.push(
                new Paragraph({
                  text: `Tarea ${index + 1}`,
                  heading: HeadingLevel.HEADING_3,
                })
              );

              const taskText = formatComplexObject(task);
              children.push(
                new Paragraph({
                  text: taskText,
                })
              );
            });
          }
        }

        // Tareas no asignadas
        if (planContent.unassignedTasks && Array.isArray(planContent.unassignedTasks) && planContent.unassignedTasks.length > 0) {
          children.push(
            new Paragraph({
              text: "Tareas Pendientes de Asignación",
              heading: HeadingLevel.HEADING_2,
            })
          );

          planContent.unassignedTasks.forEach(task => {
            const taskText = formatComplexObject(task);
            children.push(
              new Paragraph({
                text: `• ${taskText}`,
              })
            );
          });
        }

        // Dependencias
        if (planContent.ganttData && planContent.ganttData.dependencies && Array.isArray(planContent.ganttData.dependencies) && planContent.ganttData.dependencies.length > 0) {
          children.push(
            new Paragraph({
              text: "Dependencias entre Tareas",
              heading: HeadingLevel.HEADING_2,
            })
          );

          planContent.ganttData.dependencies.forEach(dependency => {
            const dependencyText = formatComplexObject(dependency);
            children.push(
              new Paragraph({
                text: `• ${dependencyText}`,
              })
            );
          });
        }
      } else {
        children.push(
          new Paragraph({
            text: String(planContent),
          })
        );
      }
    }

    // Pie de página
    children.push(
      new Paragraph({
        text: "Informe generado por Walter Meeting",
        alignment: "center",
        pageBreakBefore: true,
      })
    );

    // Crear documento Word con las secciones
    const doc = new Document({
      creator: "Walter Meeting",
      title: `Informe de Reunión - ${meetingId}`,
      description: 'Informe generado automáticamente por Walter Meeting',
      sections: [
        {
          properties: {},
          children: children,
        },
      ],
    });

    // Generar el documento
    const buffer = await Packer.toBuffer(doc);

    // Configurar encabezados para la descarga
    res.setHeader('Content-Disposition', `attachment; filename=Informe_Reunion_${meetingId}.docx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    // Enviar el documento
    res.send(buffer);

    console.log(`Informe Word generado y enviado para la reunión ${meetingId}`);
  } catch (error) {
    console.error('Error al generar informe Word:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Ruta para servir la aplicación web
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
  console.log(`API disponible en http://localhost:${PORT}/api`);
  console.log(`Interfaz de usuario disponible en http://localhost:${PORT}`);
});

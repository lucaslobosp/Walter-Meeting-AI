/**
 * Agente Analizador
 *
 * Este agente se encarga de analizar el contenido de la transcripción para
 * identificar temas clave, preguntas, respuestas y objetivos.
 */

import natural from 'natural';
import { NlpManager } from 'node-nlp';
import { generateAnalysis } from '../../services/openai.js';

class AnalyzerAgent {
  constructor(options = {}) {
    this.language = options.language || 'es';

    // Inicializar NLP Manager
    this.nlpManager = new NlpManager({ languages: [this.language] });
    this.tokenizer = new natural.AggressiveTokenizer();

    // Inicializar clasificadores
    this._initializeClassifiers();
  }

  /**
   * Inicializa los clasificadores para diferentes tipos de contenido
   * @private
   */
  _initializeClassifiers() {
    // Entrenar para reconocer preguntas
    this.nlpManager.addDocument(this.language, '¿Qué opinas sobre?', 'pregunta');
    this.nlpManager.addDocument(this.language, '¿Cuál es tu opinión?', 'pregunta');
    this.nlpManager.addDocument(this.language, '¿Cómo podemos?', 'pregunta');
    this.nlpManager.addDocument(this.language, '¿Cuándo vamos a?', 'pregunta');
    this.nlpManager.addDocument(this.language, '¿Por qué no?', 'pregunta');

    // Entrenar para reconocer objetivos
    this.nlpManager.addDocument(this.language, 'Necesitamos lograr', 'objetivo');
    this.nlpManager.addDocument(this.language, 'Nuestro objetivo es', 'objetivo');
    this.nlpManager.addDocument(this.language, 'Debemos alcanzar', 'objetivo');
    this.nlpManager.addDocument(this.language, 'La meta es', 'objetivo');
    this.nlpManager.addDocument(this.language, 'Tenemos que completar', 'objetivo');

    // Entrenar para reconocer tareas
    this.nlpManager.addDocument(this.language, 'Hay que hacer', 'tarea');
    this.nlpManager.addDocument(this.language, 'Necesitamos implementar', 'tarea');
    this.nlpManager.addDocument(this.language, 'Vamos a desarrollar', 'tarea');
    this.nlpManager.addDocument(this.language, 'Se debe crear', 'tarea');
    this.nlpManager.addDocument(this.language, 'Tenemos pendiente', 'tarea');

    // Entrenar el modelo
    this.nlpManager.train();
  }

  /**
   * Analiza una transcripción para extraer información relevante
   * @param {string|object} transcription - Transcripción en formato texto o JSON
   * @returns {Promise<object>} - Resultado del análisis
   */
  async analyze(transcription) {
    try {
      if (!transcription) {
        throw new Error('No se proporcionó transcripción para analizar');
      }

      console.log('Analizando transcripción...');
      console.log(`Tipo de transcripción: ${typeof transcription}`);

      // Convertir a texto si es un objeto
      let text;
      if (typeof transcription === 'string') {
        text = transcription;
      } else if (typeof transcription === 'object') {
        text = this._extractTextFromTranscription(transcription);
      } else {
        throw new Error(`Formato de transcripción no soportado: ${typeof transcription}`);
      }

      console.log(`Longitud del texto a analizar: ${text.length} caracteres`);
      if (text.length < 10) {
        throw new Error('El texto de la transcripción es demasiado corto para analizar');
      }

      // Intentar usar OpenAI para el análisis
      try {
        // Verificar si hay una clave API de OpenAI configurada
        if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key') {
          console.log('Usando OpenAI para el análisis...');
          const openAIAnalysis = await generateAnalysis(text);

          console.log('Análisis con OpenAI completado');

          return {
            success: true,
            analysis: openAIAnalysis,
            metadata: {
              timestamp: new Date().toISOString(),
              language: this.language,
              service: 'openai'
            }
          };
        } else {
          console.log('No hay clave API de OpenAI configurada, usando análisis local');
        }
      } catch (openAIError) {
        console.error('Error al generar análisis con OpenAI:', openAIError);
        console.log('Usando análisis local como fallback');
      }

      // Análisis local (fallback)
      console.log('Realizando análisis local...');

      // Dividir en oraciones
      const sentences = this._splitIntoSentences(text);

      // Analizar cada oración
      const analysis = {
        questions: [],
        answers: [],
        objectives: [],
        tasks: [],
        keyTopics: this._extractKeyTopics(text),
        sentiment: this._analyzeSentiment(text)
      };

      // Procesar cada oración
      for (const sentence of sentences) {
        const classification = await this.nlpManager.process(this.language, sentence);

        if (classification.intent === 'pregunta' && classification.score > 0.7) {
          analysis.questions.push({
            text: sentence,
            confidence: classification.score
          });
        } else if (classification.intent === 'objetivo' && classification.score > 0.7) {
          analysis.objectives.push({
            text: sentence,
            confidence: classification.score
          });
        } else if (classification.intent === 'tarea' && classification.score > 0.7) {
          analysis.tasks.push({
            text: sentence,
            confidence: classification.score
          });
        }

        // Buscar respuestas (oraciones que siguen a preguntas)
        if (analysis.questions.length > 0 &&
            analysis.questions[analysis.questions.length - 1].answer === undefined) {
          // La oración actual podría ser una respuesta a la última pregunta
          analysis.questions[analysis.questions.length - 1].answer = sentence;
          analysis.answers.push({
            question: analysis.questions[analysis.questions.length - 1].text,
            answer: sentence
          });
        }
      }

      return {
        success: true,
        analysis,
        metadata: {
          timestamp: new Date().toISOString(),
          language: this.language,
          service: 'local'
        }
      };
    } catch (error) {
      console.error('Error en el análisis:', error);
      return {
        success: false,
        error: error.message,
        metadata: {
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Extrae texto de un objeto de transcripción
   * @private
   */
  _extractTextFromTranscription(transcription) {
    console.log('Extrayendo texto de transcripción...');

    try {
      // Manejar diferentes formatos de transcripción
      if (!transcription) {
        throw new Error('Objeto de transcripción vacío');
      }

      // Formato OpenAI Whisper
      if (transcription.text) {
        console.log('Detectado formato Whisper/OpenAI');
        return transcription.text;
      }

      // Formato Google Speech
      if (transcription.results && Array.isArray(transcription.results)) {
        console.log('Detectado formato Google Speech');
        return transcription.results
          .map(result => result.alternatives && result.alternatives[0] ? result.alternatives[0].transcript : '')
          .filter(text => text.length > 0)
          .join(' ');
      }

      // Formato de segmentos
      if (transcription.segments && Array.isArray(transcription.segments)) {
        console.log('Detectado formato de segmentos');
        return transcription.segments
          .map(segment => segment.text || '')
          .filter(text => text.length > 0)
          .join(' ');
      }

      // Si es un string JSON, intentar parsearlo
      if (typeof transcription === 'string' && transcription.startsWith('{')) {
        try {
          const parsed = JSON.parse(transcription);
          if (parsed.text) return parsed.text;
          if (parsed.segments) {
            return parsed.segments
              .map(segment => segment.text || '')
              .filter(text => text.length > 0)
              .join(' ');
          }
        } catch (e) {
          // Si no se puede parsear, usar el string tal cual
          return transcription;
        }
      }

      // Último recurso: convertir a string
      console.log('Formato desconocido, convirtiendo a string');
      return typeof transcription === 'string'
        ? transcription
        : JSON.stringify(transcription);
    } catch (error) {
      console.error('Error al extraer texto de transcripción:', error);
      return '';
    }
  }

  /**
   * Divide el texto en oraciones
   * @private
   */
  _splitIntoSentences(text) {
    // Implementación simple de división por puntuación
    return text
      .replace(/([.?!])\s*(?=[A-Z])/g, "$1|")
      .split("|")
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  /**
   * Extrae temas clave del texto
   * @private
   */
  _extractKeyTopics(text) {
    const tokens = this.tokenizer.tokenize(text);
    const tfidf = new natural.TfIdf();

    tfidf.addDocument(tokens);

    const topics = [];
    tfidf.listTerms(0).slice(0, 10).forEach(item => {
      topics.push({
        term: item.term,
        tfidf: item.tfidf
      });
    });

    return topics;
  }

  /**
   * Analiza el sentimiento del texto
   * @private
   */
  _analyzeSentiment(text) {
    try {
      // Implementación simple de análisis de sentimiento para español
      // ya que natural.SentimentAnalyzer no soporta 'afinn' para español

      // Lista de palabras positivas en español
      const positiveWords = [
        'bueno', 'excelente', 'genial', 'increíble', 'maravilloso', 'fantástico',
        'positivo', 'éxito', 'logro', 'feliz', 'contento', 'alegre', 'satisfecho',
        'eficiente', 'eficaz', 'productivo', 'innovador', 'creativo', 'motivado',
        'optimista', 'mejorar', 'progreso', 'avance', 'solución', 'oportunidad'
      ];

      // Lista de palabras negativas en español
      const negativeWords = [
        'malo', 'terrible', 'pésimo', 'horrible', 'deficiente', 'negativo',
        'fracaso', 'problema', 'error', 'fallo', 'triste', 'enojado', 'frustrado',
        'ineficiente', 'ineficaz', 'improductivo', 'desmotivado', 'pesimista',
        'empeorar', 'retroceso', 'obstáculo', 'dificultad', 'amenaza'
      ];

      const tokens = this.tokenizer.tokenize(text.toLowerCase());

      let positiveCount = 0;
      let negativeCount = 0;

      // Contar palabras positivas y negativas
      tokens.forEach(token => {
        if (positiveWords.includes(token)) {
          positiveCount++;
        } else if (negativeWords.includes(token)) {
          negativeCount++;
        }
      });

      // Calcular puntuación de sentimiento
      const score = (positiveCount - negativeCount) / (positiveCount + negativeCount || 1);

      return {
        score: score,
        comparative: score / tokens.length,
        positiveCount,
        negativeCount
      };
    } catch (error) {
      console.error('Error en el análisis de sentimiento:', error);
      // Devolver un valor neutral en caso de error
      return {
        score: 0,
        comparative: 0,
        error: error.message
      };
    }
  }
}

export default AnalyzerAgent;

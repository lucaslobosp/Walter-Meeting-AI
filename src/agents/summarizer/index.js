/**
 * Agente de Resumen
 *
 * Este agente se encarga de crear resúmenes concisos de las reuniones
 * basados en la transcripción y el análisis.
 */

import natural from 'natural';
import { generateSummary } from '../../services/openai.js';

class SummarizerAgent {
  constructor(options = {}) {
    this.language = options.language || 'es';
    this.maxSummaryLength = options.maxSummaryLength || 500;
    this.maxSentences = options.maxSentences || 5;

    // Inicializar tokenizador
    this.tokenizer = new natural.AggressiveTokenizer();
    this.sentenceTokenizer = new natural.SentenceTokenizer();
  }

  /**
   * Genera un resumen de la reunión basado en la transcripción y el análisis
   * @param {string|object} transcription - Transcripción de la reunión
   * @param {object} analysis - Análisis de la reunión (opcional)
   * @returns {Promise<object>} - Resumen generado
   */
  async summarize(transcription, analysis = null) {
    try {
      // Convertir a texto si es un objeto
      const text = typeof transcription === 'object'
        ? this._extractTextFromTranscription(transcription)
        : transcription;

      console.log('Generando resumen con OpenAI...');

      // Intentar generar resumen con OpenAI
      try {
        // Verificar si hay una clave API de OpenAI configurada
        if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key') {
          const openAISummary = await generateSummary(text);

          console.log('Resumen generado con OpenAI correctamente');

          return {
            success: true,
            summary: openAISummary,
            metadata: {
              timestamp: new Date().toISOString(),
              language: this.language,
              originalTextLength: text.length,
              summaryLength: openAISummary.executive.length,
              service: 'openai'
            }
          };
        } else {
          console.log('No hay clave API de OpenAI configurada, usando método extractivo');
        }
      } catch (openAIError) {
        console.error('Error al generar resumen con OpenAI:', openAIError);
        console.log('Usando método extractivo como fallback');
      }

      // Método extractivo (fallback)
      console.log('Generando resumen extractivo...');

      // Generar resumen extractivo (basado en frases importantes)
      const extractiveSummary = this._generateExtractiveSummary(text);

      // Generar resumen de puntos clave
      const keyPoints = this._generateKeyPoints(text, analysis);

      // Generar resumen de preguntas y respuestas
      const qaSection = this._generateQASection(analysis);

      // Generar resumen de objetivos
      const objectivesSection = this._generateObjectivesSection(analysis);

      return {
        success: true,
        summary: {
          executive: extractiveSummary,
          keyPoints,
          questionsAndAnswers: qaSection,
          objectives: objectivesSection
        },
        metadata: {
          timestamp: new Date().toISOString(),
          language: this.language,
          originalTextLength: text.length,
          summaryLength: extractiveSummary.length,
          service: 'extractive'
        }
      };
    } catch (error) {
      console.error('Error al generar el resumen:', error);
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
    // Manejar diferentes formatos de transcripción
    if (transcription.results) {
      // Formato Google Speech
      return transcription.results
        .map(result => result.alternatives[0].transcript)
        .join(' ');
    } else if (transcription.text) {
      // Formato Whisper
      return transcription.text;
    } else {
      // Formato desconocido
      return JSON.stringify(transcription);
    }
  }

  /**
   * Genera un resumen extractivo basado en las oraciones más importantes
   * @private
   */
  _generateExtractiveSummary(text) {
    // Dividir en oraciones
    const sentences = this.sentenceTokenizer.tokenize(text);

    // Calcular la frecuencia de palabras
    const wordFrequencies = {};
    sentences.forEach(sentence => {
      const tokens = this.tokenizer.tokenize(sentence.toLowerCase());
      tokens.forEach(token => {
        if (token.length > 2) { // Ignorar palabras muy cortas
          wordFrequencies[token] = (wordFrequencies[token] || 0) + 1;
        }
      });
    });

    // Calcular la puntuación de cada oración basada en la frecuencia de palabras
    const sentenceScores = sentences.map(sentence => {
      const tokens = this.tokenizer.tokenize(sentence.toLowerCase());
      let score = 0;
      tokens.forEach(token => {
        if (token.length > 2 && wordFrequencies[token]) {
          score += wordFrequencies[token];
        }
      });
      return { sentence, score: score / tokens.length };
    });

    // Ordenar oraciones por puntuación y seleccionar las mejores
    const topSentences = sentenceScores
      .sort((a, b) => b.score - a.score)
      .slice(0, this.maxSentences)
      .sort((a, b) => sentences.indexOf(a.sentence) - sentences.indexOf(b.sentence)) // Restaurar orden original
      .map(item => item.sentence);

    // Unir oraciones en un resumen
    return topSentences.join(' ');
  }

  /**
   * Genera una lista de puntos clave basados en el texto y el análisis
   * @private
   */
  _generateKeyPoints(text, analysis) {
    const keyPoints = [];

    // Si hay análisis disponible, usar los temas clave
    if (analysis && analysis.keyTopics && analysis.keyTopics.length > 0) {
      // Extraer oraciones que contienen los temas clave
      const sentences = this.sentenceTokenizer.tokenize(text);
      const topTopics = analysis.keyTopics.slice(0, 5).map(topic => topic.term);

      topTopics.forEach(topic => {
        const relevantSentences = sentences.filter(sentence =>
          sentence.toLowerCase().includes(topic.toLowerCase())
        );

        if (relevantSentences.length > 0) {
          // Usar la primera oración relevante como punto clave
          keyPoints.push(relevantSentences[0]);
        }
      });
    } else {
      // Si no hay análisis, usar el método extractivo para generar puntos clave
      const sentences = this.sentenceTokenizer.tokenize(text);
      const wordFrequencies = {};

      sentences.forEach(sentence => {
        const tokens = this.tokenizer.tokenize(sentence.toLowerCase());
        tokens.forEach(token => {
          if (token.length > 2) {
            wordFrequencies[token] = (wordFrequencies[token] || 0) + 1;
          }
        });
      });

      // Calcular puntuación de oraciones
      const sentenceScores = sentences.map(sentence => {
        const tokens = this.tokenizer.tokenize(sentence.toLowerCase());
        let score = 0;
        tokens.forEach(token => {
          if (token.length > 2 && wordFrequencies[token]) {
            score += wordFrequencies[token];
          }
        });
        return { sentence, score: score / tokens.length };
      });

      // Seleccionar las 5 mejores oraciones como puntos clave
      const topSentences = sentenceScores
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(item => item.sentence);

      keyPoints.push(...topSentences);
    }

    return keyPoints;
  }

  /**
   * Genera una sección de preguntas y respuestas basada en el análisis
   * @private
   */
  _generateQASection(analysis) {
    if (!analysis || !analysis.questions || analysis.questions.length === 0) {
      return [];
    }

    return analysis.questions.map(question => ({
      question: question.text,
      answer: question.answer || 'Sin respuesta registrada'
    }));
  }

  /**
   * Genera una sección de objetivos basada en el análisis
   * @private
   */
  _generateObjectivesSection(analysis) {
    if (!analysis || !analysis.objectives || analysis.objectives.length === 0) {
      return [];
    }

    return analysis.objectives.map(objective => objective.text);
  }
}

export default SummarizerAgent;

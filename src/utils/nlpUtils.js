/**
 * Utilidades para procesamiento de lenguaje natural
 * 
 * Funciones para análisis y procesamiento de texto.
 */

import natural from 'natural';

// Inicializar tokenizadores
const tokenizer = new natural.AggressiveTokenizer();
const sentenceTokenizer = new natural.SentenceTokenizer();

// Inicializar stemmer para español
const stemmer = natural.PorterStemmerEs;

/**
 * Tokeniza un texto en palabras
 * @param {string} text - Texto a tokenizar
 * @returns {Array} - Lista de tokens
 */
export function tokenize(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }
  
  return tokenizer.tokenize(text);
}

/**
 * Divide un texto en oraciones
 * @param {string} text - Texto a dividir
 * @returns {Array} - Lista de oraciones
 */
export function splitIntoSentences(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }
  
  return sentenceTokenizer.tokenize(text);
}

/**
 * Extrae palabras clave de un texto
 * @param {string} text - Texto a analizar
 * @param {number} limit - Número máximo de palabras clave
 * @returns {Array} - Lista de palabras clave con puntuación
 */
export function extractKeywords(text, limit = 10) {
  if (!text || typeof text !== 'string') {
    return [];
  }
  
  // Tokenizar texto
  const tokens = tokenize(text.toLowerCase());
  
  // Eliminar palabras vacías (stopwords)
  const stopwords = ['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'a', 'ante', 'bajo', 'con', 'de', 'desde', 'en', 'entre', 'hacia', 'hasta', 'para', 'por', 'según', 'sin', 'sobre', 'tras', 'que', 'como', 'cuando', 'donde', 'si', 'no', 'es', 'son', 'está', 'están'];
  const filteredTokens = tokens.filter(token => 
    token.length > 2 && !stopwords.includes(token)
  );
  
  // Calcular frecuencia de palabras
  const tfidf = new natural.TfIdf();
  tfidf.addDocument(filteredTokens);
  
  // Extraer palabras clave
  const keywords = [];
  tfidf.listTerms(0).slice(0, limit).forEach(item => {
    keywords.push({
      term: item.term,
      score: item.tfidf
    });
  });
  
  return keywords;
}

/**
 * Analiza el sentimiento de un texto
 * @param {string} text - Texto a analizar
 * @returns {object} - Resultado del análisis de sentimiento
 */
export function analyzeSentiment(text) {
  if (!text || typeof text !== 'string') {
    return { score: 0, comparative: 0 };
  }
  
  // Tokenizar texto
  const tokens = tokenize(text.toLowerCase());
  
  // Analizar sentimiento
  const analyzer = new natural.SentimentAnalyzer('es', stemmer, 'afinn');
  const score = analyzer.getSentiment(tokens);
  
  return {
    score,
    comparative: tokens.length > 0 ? score / tokens.length : 0,
    tokens: tokens.length
  };
}

/**
 * Clasifica un texto en categorías predefinidas
 * @param {string} text - Texto a clasificar
 * @param {Array} categories - Categorías con ejemplos
 * @returns {object} - Resultado de la clasificación
 */
export function classifyText(text, categories) {
  if (!text || typeof text !== 'string' || !categories || !Array.isArray(categories)) {
    return { category: null, confidence: 0 };
  }
  
  // Crear clasificador
  const classifier = new natural.BayesClassifier();
  
  // Entrenar clasificador
  categories.forEach(category => {
    if (category.examples && Array.isArray(category.examples)) {
      category.examples.forEach(example => {
        classifier.addDocument(example, category.name);
      });
    }
  });
  
  classifier.train();
  
  // Clasificar texto
  const classification = classifier.getClassifications(text);
  const topCategory = classification[0];
  
  return {
    category: topCategory ? topCategory.label : null,
    confidence: topCategory ? topCategory.value : 0,
    allCategories: classification
  };
}

/**
 * Encuentra entidades nombradas en un texto (implementación simple)
 * @param {string} text - Texto a analizar
 * @returns {Array} - Lista de entidades encontradas
 */
export function findNamedEntities(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }
  
  // Implementación simple basada en patrones
  const entities = [];
  
  // Buscar fechas (formato DD/MM/YYYY o DD-MM-YYYY)
  const dateRegex = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g;
  let match;
  while ((match = dateRegex.exec(text)) !== null) {
    entities.push({
      type: 'DATE',
      text: match[0],
      position: match.index
    });
  }
  
  // Buscar horas (formato HH:MM)
  const timeRegex = /(\d{1,2}):(\d{2})(?:\s*(?:AM|PM|am|pm))?/g;
  while ((match = timeRegex.exec(text)) !== null) {
    entities.push({
      type: 'TIME',
      text: match[0],
      position: match.index
    });
  }
  
  // Buscar nombres propios (palabras que comienzan con mayúscula)
  const nameRegex = /\b[A-Z][a-zñáéíóú]+\b/g;
  while ((match = nameRegex.exec(text)) !== null) {
    // Verificar que no es inicio de oración
    if (match.index === 0 || text[match.index - 2] === '.') {
      continue;
    }
    
    entities.push({
      type: 'PERSON',
      text: match[0],
      position: match.index
    });
  }
  
  return entities;
}

/**
 * Encuentra preguntas en un texto
 * @param {string} text - Texto a analizar
 * @returns {Array} - Lista de preguntas encontradas
 */
export function findQuestions(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }
  
  // Dividir en oraciones
  const sentences = splitIntoSentences(text);
  
  // Filtrar preguntas
  const questions = sentences.filter(sentence => {
    // Verificar si contiene signos de interrogación
    if (sentence.includes('?')) {
      return true;
    }
    
    // Verificar si comienza con palabra interrogativa
    const interrogativeWords = ['qué', 'quién', 'quiénes', 'cuál', 'cuáles', 'cómo', 'dónde', 'cuándo', 'cuánto', 'cuánta', 'cuántos', 'cuántas', 'por qué'];
    const lowerSentence = sentence.toLowerCase();
    
    return interrogativeWords.some(word => 
      lowerSentence.startsWith(word + ' ') || lowerSentence.startsWith('¿' + word)
    );
  });
  
  return questions;
}

export default {
  tokenize,
  splitIntoSentences,
  extractKeywords,
  analyzeSentiment,
  classifyText,
  findNamedEntities,
  findQuestions
};

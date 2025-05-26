/**
 * Componente para renderizar el análisis
 */

export function renderAnalysis(container, analysisData) {
  // Verificar si hay datos de análisis
  if (!analysisData || !analysisData.analysis) {
    container.innerHTML = `
      <div class="alert alert-warning">
        <i class="fas fa-exclamation-triangle"></i> No hay datos de análisis disponibles.
      </div>
    `;
    return;
  }
  
  const analysis = analysisData.analysis;
  
  // Crear contenedor para el análisis
  const analysisElement = document.createElement('div');
  
  // Temas clave
  if (analysis.keyTopics && analysis.keyTopics.length > 0) {
    const keyTopicsSection = document.createElement('div');
    keyTopicsSection.className = 'analysis-item';
    
    let keyTopicsHTML = `
      <h3 class="analysis-item-title">Temas Clave</h3>
      <div class="analysis-item-content">
    `;
    
    analysis.keyTopics.forEach(topic => {
      const score = Math.round(topic.tfidf * 100) / 100;
      keyTopicsHTML += `
        <span class="badge badge-primary" style="margin-right: 0.5rem; margin-bottom: 0.5rem;">
          ${topic.term} (${score})
        </span>
      `;
    });
    
    keyTopicsHTML += `</div>`;
    keyTopicsSection.innerHTML = keyTopicsHTML;
    
    analysisElement.appendChild(keyTopicsSection);
  }
  
  // Sentimiento
  if (analysis.sentiment) {
    const sentimentSection = document.createElement('div');
    sentimentSection.className = 'analysis-item';
    
    // Determinar el tipo de sentimiento
    let sentimentType = 'neutral';
    let sentimentIcon = 'fa-meh';
    let sentimentColor = 'text-light';
    
    if (analysis.sentiment.score > 0.2) {
      sentimentType = 'positive';
      sentimentIcon = 'fa-smile';
      sentimentColor = 'text-success';
    } else if (analysis.sentiment.score < -0.2) {
      sentimentType = 'negative';
      sentimentIcon = 'fa-frown';
      sentimentColor = 'text-danger';
    }
    
    const score = Math.round(analysis.sentiment.score * 100) / 100;
    
    sentimentSection.innerHTML = `
      <h3 class="analysis-item-title">Análisis de Sentimiento</h3>
      <div class="analysis-item-content flex items-center gap-2">
        <i class="fas ${sentimentIcon} ${sentimentColor}" style="font-size: 1.5rem;"></i>
        <div>
          <p>Tono general: <strong>${sentimentType}</strong></p>
          <p>Puntuación: <strong>${score}</strong> (rango de -1 a 1)</p>
        </div>
      </div>
    `;
    
    analysisElement.appendChild(sentimentSection);
  }
  
  // Preguntas
  if (analysis.questions && analysis.questions.length > 0) {
    const questionsSection = document.createElement('div');
    questionsSection.className = 'analysis-item';
    
    let questionsHTML = `
      <h3 class="analysis-item-title">Preguntas Identificadas</h3>
      <div class="analysis-item-content">
        <ul>
    `;
    
    analysis.questions.forEach(question => {
      questionsHTML += `
        <li>
          <p>${question.text}</p>
          ${question.answer ? `<p class="text-sm text-light">Respuesta: ${question.answer}</p>` : ''}
        </li>
      `;
    });
    
    questionsHTML += `
        </ul>
      </div>
    `;
    questionsSection.innerHTML = questionsHTML;
    
    analysisElement.appendChild(questionsSection);
  }
  
  // Objetivos
  if (analysis.objectives && analysis.objectives.length > 0) {
    const objectivesSection = document.createElement('div');
    objectivesSection.className = 'analysis-item';
    
    let objectivesHTML = `
      <h3 class="analysis-item-title">Objetivos Identificados</h3>
      <div class="analysis-item-content">
        <ul>
    `;
    
    analysis.objectives.forEach(objective => {
      const text = objective.text || objective;
      objectivesHTML += `<li>${text}</li>`;
    });
    
    objectivesHTML += `
        </ul>
      </div>
    `;
    objectivesSection.innerHTML = objectivesHTML;
    
    analysisElement.appendChild(objectivesSection);
  }
  
  // Tareas
  if (analysis.tasks && analysis.tasks.length > 0) {
    const tasksSection = document.createElement('div');
    tasksSection.className = 'analysis-item';
    
    let tasksHTML = `
      <h3 class="analysis-item-title">Tareas Identificadas</h3>
      <div class="analysis-item-content">
        <ul>
    `;
    
    analysis.tasks.forEach(task => {
      const text = task.text || task;
      tasksHTML += `<li>${text}</li>`;
    });
    
    tasksHTML += `
        </ul>
      </div>
    `;
    tasksSection.innerHTML = tasksHTML;
    
    analysisElement.appendChild(tasksSection);
  }
  
  // Limpiar y añadir al contenedor
  container.innerHTML = '';
  container.appendChild(analysisElement);
  
  // Añadir información de metadatos
  if (analysisData.metadata) {
    const metadataElement = document.createElement('div');
    metadataElement.className = 'mt-4 text-light text-sm';
    
    const timestamp = new Date(analysisData.metadata.timestamp);
    const formattedDate = timestamp.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    metadataElement.innerHTML = `
      <p>Análisis generado el ${formattedDate}</p>
      <p>Idioma: ${analysisData.metadata.language || 'No especificado'}</p>
    `;
    
    container.appendChild(metadataElement);
  }
}

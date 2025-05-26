/**
 * Componente para renderizar el resumen
 */

export function renderSummary(container, summaryData) {
  // Verificar si hay datos de resumen
  if (!summaryData || !summaryData.summary) {
    container.innerHTML = `
      <div class="alert alert-warning">
        <i class="fas fa-exclamation-triangle"></i> No hay datos de resumen disponibles.
      </div>
    `;
    return;
  }
  
  const summary = summaryData.summary;
  
  // Crear contenedor para el resumen
  const summaryElement = document.createElement('div');
  
  // Resumen ejecutivo
  if (summary.executive) {
    const executiveSection = document.createElement('div');
    executiveSection.className = 'summary-section';
    
    executiveSection.innerHTML = `
      <h3 class="summary-section-title">Resumen Ejecutivo</h3>
      <p>${summary.executive}</p>
    `;
    
    summaryElement.appendChild(executiveSection);
  }
  
  // Puntos clave
  if (summary.keyPoints && summary.keyPoints.length > 0) {
    const keyPointsSection = document.createElement('div');
    keyPointsSection.className = 'summary-section';
    
    let keyPointsHTML = `
      <h3 class="summary-section-title">Puntos Clave</h3>
      <ul>
    `;
    
    summary.keyPoints.forEach(point => {
      keyPointsHTML += `<li>${point}</li>`;
    });
    
    keyPointsHTML += `</ul>`;
    keyPointsSection.innerHTML = keyPointsHTML;
    
    summaryElement.appendChild(keyPointsSection);
  }
  
  // Preguntas y respuestas
  if (summary.questionsAndAnswers && summary.questionsAndAnswers.length > 0) {
    const qaSection = document.createElement('div');
    qaSection.className = 'summary-section';
    
    let qaHTML = `
      <h3 class="summary-section-title">Preguntas y Respuestas</h3>
      <div class="mt-2">
    `;
    
    summary.questionsAndAnswers.forEach(qa => {
      qaHTML += `
        <div class="mb-2">
          <p class="font-bold">P: ${qa.question}</p>
          <p>R: ${qa.answer}</p>
        </div>
      `;
    });
    
    qaHTML += `</div>`;
    qaSection.innerHTML = qaHTML;
    
    summaryElement.appendChild(qaSection);
  }
  
  // Objetivos
  if (summary.objectives && summary.objectives.length > 0) {
    const objectivesSection = document.createElement('div');
    objectivesSection.className = 'summary-section';
    
    let objectivesHTML = `
      <h3 class="summary-section-title">Objetivos Identificados</h3>
      <ul>
    `;
    
    summary.objectives.forEach(objective => {
      objectivesHTML += `<li>${objective}</li>`;
    });
    
    objectivesHTML += `</ul>`;
    objectivesSection.innerHTML = objectivesHTML;
    
    summaryElement.appendChild(objectivesSection);
  }
  
  // Limpiar y añadir al contenedor
  container.innerHTML = '';
  container.appendChild(summaryElement);
  
  // Añadir información de metadatos
  if (summaryData.metadata) {
    const metadataElement = document.createElement('div');
    metadataElement.className = 'mt-4 text-light text-sm';
    
    const timestamp = new Date(summaryData.metadata.timestamp);
    const formattedDate = timestamp.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    metadataElement.innerHTML = `
      <p>Resumen generado el ${formattedDate}</p>
      <p>Longitud original: ${summaryData.metadata.originalTextLength || 'No disponible'} caracteres</p>
      <p>Longitud del resumen: ${summaryData.metadata.summaryLength || 'No disponible'} caracteres</p>
    `;
    
    container.appendChild(metadataElement);
  }
}

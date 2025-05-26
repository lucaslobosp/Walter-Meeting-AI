/**
 * Componente para renderizar la carta Gantt
 */

export function renderGanttChart(container, planData) {
  // Verificar si hay datos de plan
  if (!planData || !planData.plan) {
    container.innerHTML = `
      <div class="alert alert-warning">
        <i class="fas fa-exclamation-triangle"></i> No hay datos de plan disponibles.
      </div>
    `;
    return;
  }
  
  const plan = planData.plan;
  
  // Crear contenedor para el plan
  const planElement = document.createElement('div');
  
  // Información general del plan
  const infoSection = document.createElement('div');
  infoSection.className = 'mb-4';
  
  infoSection.innerHTML = `
    <h3 class="card-title">${plan.name || 'Plan de Trabajo'}</h3>
    <p>${plan.description || 'Plan generado automáticamente basado en la reunión'}</p>
    <div class="flex gap-4 mt-2">
      <div>
        <span class="text-light">Fecha de inicio:</span>
        <strong>${formatDate(plan.startDate)}</strong>
      </div>
      <div>
        <span class="text-light">Fecha de fin:</span>
        <strong>${formatDate(plan.endDate)}</strong>
      </div>
    </div>
  `;
  
  planElement.appendChild(infoSection);
  
  // Objetivos
  if (plan.objectives && plan.objectives.length > 0) {
    const objectivesSection = document.createElement('div');
    objectivesSection.className = 'mb-4';
    
    let objectivesHTML = `
      <h3 class="summary-section-title">Objetivos</h3>
      <ul class="mt-2">
    `;
    
    plan.objectives.forEach(objective => {
      objectivesHTML += `<li>${objective.text}</li>`;
    });
    
    objectivesHTML += `</ul>`;
    objectivesSection.innerHTML = objectivesHTML;
    
    planElement.appendChild(objectivesSection);
  }
  
  // Carta Gantt
  if (plan.ganttData && plan.ganttData.tasks && plan.ganttData.tasks.length > 0) {
    const ganttSection = document.createElement('div');
    ganttSection.className = 'mt-4';
    
    ganttSection.innerHTML = `
      <h3 class="summary-section-title">Carta Gantt</h3>
    `;
    
    // Crear contenedor para la carta Gantt
    const ganttContainer = document.createElement('div');
    ganttContainer.className = 'gantt-container mt-2';
    
    // Calcular fechas mínima y máxima
    const dates = plan.ganttData.tasks.flatMap(task => [
      new Date(task.start_date),
      new Date(task.end_date)
    ]);
    
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    
    // Calcular duración total en días
    const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1;
    
    // Renderizar tareas
    plan.ganttData.tasks.forEach(task => {
      const taskElement = document.createElement('div');
      taskElement.className = 'gantt-task';
      
      // Calcular posición y ancho de la barra
      const startDate = new Date(task.start_date);
      const endDate = new Date(task.end_date);
      
      const startOffset = Math.ceil((startDate - minDate) / (1000 * 60 * 60 * 24));
      const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
      
      const startPercent = (startOffset / totalDays) * 100;
      const widthPercent = (duration / totalDays) * 100;
      
      // Determinar color según estado
      let statusColor = 'var(--primary-color)';
      if (task.progress === 1) {
        statusColor = 'var(--success-color)';
      } else if (task.progress === 0.5) {
        statusColor = 'var(--warning-color)';
      }
      
      taskElement.innerHTML = `
        <div class="gantt-task-label">${task.text}</div>
        <div class="gantt-task-bar-container">
          <div class="gantt-task-bar" style="left: ${startPercent}%; width: ${widthPercent}%; background-color: ${statusColor};">
            ${task.progress > 0 ? `<div class="gantt-task-progress" style="width: ${task.progress * 100}%;"></div>` : ''}
          </div>
        </div>
      `;
      
      ganttContainer.appendChild(taskElement);
    });
    
    // Añadir leyenda de fechas
    const datesLegend = document.createElement('div');
    datesLegend.className = 'flex justify-between text-sm text-light mt-2';
    datesLegend.innerHTML = `
      <div>${formatDate(minDate.toISOString().split('T')[0])}</div>
      <div>${formatDate(maxDate.toISOString().split('T')[0])}</div>
    `;
    
    ganttSection.appendChild(ganttContainer);
    ganttSection.appendChild(datesLegend);
    
    planElement.appendChild(ganttSection);
  }
  
  // Tareas no asignadas
  if (plan.unassignedTasks && plan.unassignedTasks.length > 0) {
    const unassignedSection = document.createElement('div');
    unassignedSection.className = 'mt-4';
    
    let unassignedHTML = `
      <h3 class="summary-section-title">Tareas Adicionales</h3>
      <ul class="mt-2">
    `;
    
    plan.unassignedTasks.forEach(task => {
      unassignedHTML += `<li>${task.text}</li>`;
    });
    
    unassignedHTML += `</ul>`;
    unassignedSection.innerHTML = unassignedHTML;
    
    planElement.appendChild(unassignedSection);
  }
  
  // Limpiar y añadir al contenedor
  container.innerHTML = '';
  container.appendChild(planElement);
  
  // Añadir información de metadatos
  if (planData.metadata) {
    const metadataElement = document.createElement('div');
    metadataElement.className = 'mt-4 text-light text-sm';
    
    const timestamp = new Date(planData.metadata.timestamp);
    const formattedDate = timestamp.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    metadataElement.innerHTML = `
      <p>Plan generado el ${formattedDate}</p>
      <p>Objetivos: ${planData.metadata.objectivesCount || 0}</p>
      <p>Tareas: ${planData.metadata.tasksCount || 0}</p>
    `;
    
    container.appendChild(metadataElement);
  }
}

// Función auxiliar para formatear fechas
function formatDate(dateString) {
  if (!dateString) return 'No disponible';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

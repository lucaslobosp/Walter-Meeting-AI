/**
 * Agente de Seguimiento
 * 
 * Este agente se encarga de hacer seguimiento a los objetivos y tareas
 * identificados en las reuniones.
 */

import { v4 as uuidv4 } from 'uuid';

class TrackerAgent {
  constructor(options = {}) {
    this.tasks = new Map();
    this.objectives = new Map();
    this.storage = options.storage || null; // Para persistencia opcional
  }

  /**
   * Procesa los objetivos y tareas identificados en el análisis
   * @param {object} analysis - Análisis de la reunión
   * @param {string} meetingId - Identificador de la reunión
   * @returns {Promise<object>} - Resultado del seguimiento
   */
  async trackMeeting(analysis, meetingId) {
    try {
      if (!analysis) {
        throw new Error('No se proporcionó análisis para el seguimiento');
      }

      const meetingTimestamp = new Date().toISOString();
      const trackingResult = {
        meetingId,
        timestamp: meetingTimestamp,
        objectives: [],
        tasks: []
      };

      // Procesar objetivos
      if (analysis.objectives && analysis.objectives.length > 0) {
        analysis.objectives.forEach(objective => {
          const objectiveId = uuidv4();
          const objectiveData = {
            id: objectiveId,
            text: objective.text || objective,
            status: 'PENDING',
            createdAt: meetingTimestamp,
            meetingId,
            relatedTasks: []
          };

          this.objectives.set(objectiveId, objectiveData);
          trackingResult.objectives.push(objectiveData);
        });
      }

      // Procesar tareas
      if (analysis.tasks && analysis.tasks.length > 0) {
        analysis.tasks.forEach(task => {
          const taskId = uuidv4();
          const taskData = {
            id: taskId,
            text: task.text || task,
            status: 'TODO',
            createdAt: meetingTimestamp,
            meetingId,
            dueDate: this._estimateDueDate(task.text || task),
            assignee: this._extractAssignee(task.text || task)
          };

          this.tasks.set(taskId, taskData);
          trackingResult.tasks.push(taskData);

          // Relacionar tareas con objetivos si es posible
          this._relateTaskToObjectives(taskData, trackingResult.objectives);
        });
      }

      // Guardar en almacenamiento si está disponible
      if (this.storage) {
        await this._saveToStorage(trackingResult);
      }

      return {
        success: true,
        tracking: trackingResult,
        metadata: {
          timestamp: meetingTimestamp,
          meetingId
        }
      };
    } catch (error) {
      console.error('Error en el seguimiento:', error);
      return {
        success: false,
        error: error.message,
        metadata: {
          timestamp: new Date().toISOString(),
          meetingId
        }
      };
    }
  }

  /**
   * Actualiza el estado de una tarea
   * @param {string} taskId - ID de la tarea
   * @param {string} status - Nuevo estado
   * @returns {object} - Tarea actualizada
   */
  updateTaskStatus(taskId, status) {
    if (!this.tasks.has(taskId)) {
      throw new Error(`Tarea no encontrada: ${taskId}`);
    }

    const validStatuses = ['TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Estado no válido: ${status}`);
    }

    const task = this.tasks.get(taskId);
    task.status = status;
    task.updatedAt = new Date().toISOString();

    this.tasks.set(taskId, task);
    return task;
  }

  /**
   * Actualiza el estado de un objetivo
   * @param {string} objectiveId - ID del objetivo
   * @param {string} status - Nuevo estado
   * @returns {object} - Objetivo actualizado
   */
  updateObjectiveStatus(objectiveId, status) {
    if (!this.objectives.has(objectiveId)) {
      throw new Error(`Objetivo no encontrado: ${objectiveId}`);
    }

    const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Estado no válido: ${status}`);
    }

    const objective = this.objectives.get(objectiveId);
    objective.status = status;
    objective.updatedAt = new Date().toISOString();

    this.objectives.set(objectiveId, objective);
    return objective;
  }

  /**
   * Obtiene todas las tareas
   * @returns {Array} - Lista de tareas
   */
  getAllTasks() {
    return Array.from(this.tasks.values());
  }

  /**
   * Obtiene todos los objetivos
   * @returns {Array} - Lista de objetivos
   */
  getAllObjectives() {
    return Array.from(this.objectives.values());
  }

  /**
   * Estima una fecha de vencimiento basada en el texto de la tarea
   * @private
   */
  _estimateDueDate(taskText) {
    // Implementación simple para detectar fechas en el texto
    const nextWeekRegex = /próxima semana|next week/i;
    const nextMonthRegex = /próximo mes|next month/i;
    const specificDateRegex = /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/;

    const now = new Date();
    let dueDate = new Date();

    if (nextWeekRegex.test(taskText)) {
      dueDate.setDate(now.getDate() + 7);
    } else if (nextMonthRegex.test(taskText)) {
      dueDate.setMonth(now.getMonth() + 1);
    } else {
      const dateMatch = taskText.match(specificDateRegex);
      if (dateMatch) {
        const day = parseInt(dateMatch[1], 10);
        const month = parseInt(dateMatch[2], 10) - 1; // Los meses en JS son 0-indexed
        const year = dateMatch[3] ? parseInt(dateMatch[3], 10) : now.getFullYear();
        
        // Ajustar año si se proporcionó en formato corto (22 -> 2022)
        const fullYear = year < 100 ? 2000 + year : year;
        
        dueDate = new Date(fullYear, month, day);
      } else {
        // Por defecto, 2 semanas
        dueDate.setDate(now.getDate() + 14);
      }
    }

    return dueDate.toISOString().split('T')[0]; // Formato YYYY-MM-DD
  }

  /**
   * Extrae el asignado de una tarea basado en el texto
   * @private
   */
  _extractAssignee(taskText) {
    // Implementación simple para detectar nombres en el texto
    const assigneeRegex = /(?:asignado a|assigned to|responsable:?)\s+([A-Za-zÁáÉéÍíÓóÚúÑñ\s]+?)(?:,|\.|$)/i;
    
    const match = taskText.match(assigneeRegex);
    if (match && match[1]) {
      return match[1].trim();
    }
    
    return 'Sin asignar';
  }

  /**
   * Relaciona una tarea con objetivos relevantes
   * @private
   */
  _relateTaskToObjectives(task, objectives) {
    if (!objectives || objectives.length === 0) {
      return;
    }

    // Implementación simple: relacionar tareas con objetivos basados en palabras clave compartidas
    const taskWords = task.text.toLowerCase().split(/\s+/);
    
    objectives.forEach(objective => {
      const objectiveWords = objective.text.toLowerCase().split(/\s+/);
      
      // Contar palabras compartidas (excluyendo palabras comunes)
      const commonWords = taskWords.filter(word => 
        word.length > 3 && objectiveWords.includes(word)
      );
      
      if (commonWords.length >= 2) { // Si hay al menos 2 palabras en común
        // Relacionar tarea con objetivo
        objective.relatedTasks.push(task.id);
        
        // Actualizar en el mapa de objetivos
        if (this.objectives.has(objective.id)) {
          const storedObjective = this.objectives.get(objective.id);
          if (!storedObjective.relatedTasks.includes(task.id)) {
            storedObjective.relatedTasks.push(task.id);
            this.objectives.set(objective.id, storedObjective);
          }
        }
      }
    });
  }

  /**
   * Guarda los datos en el almacenamiento
   * @private
   */
  async _saveToStorage(data) {
    if (!this.storage) {
      return;
    }

    try {
      await this.storage.save('tracking', data);
    } catch (error) {
      console.error('Error al guardar en almacenamiento:', error);
    }
  }
}

export default TrackerAgent;

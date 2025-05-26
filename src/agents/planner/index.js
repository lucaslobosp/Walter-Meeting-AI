/**
 * Agente de Planificación
 *
 * Este agente se encarga de crear planes y cartas Gantt basados en
 * los objetivos y tareas identificados en las reuniones.
 */

import { v4 as uuidv4 } from 'uuid';
import { generatePlan } from '../../services/openai.js';

class PlannerAgent {
  constructor(options = {}) {
    this.plans = new Map();
    this.defaultDuration = options.defaultDuration || 14; // días
  }

  /**
   * Crea un plan basado en objetivos y tareas
   * @param {Array} objectives - Lista de objetivos
   * @param {Array} tasks - Lista de tareas
   * @param {string} transcriptionText - Texto de la transcripción (opcional)
   * @returns {Promise<object>} - Plan generado
   */
  async createPlan(objectives, tasks, transcriptionText = null) {
    try {
      if (!objectives || !tasks) {
        throw new Error('Se requieren objetivos y tareas para crear un plan');
      }

      console.log('Creando plan...');

      // Intentar usar OpenAI para generar el plan si hay texto de transcripción
      if (transcriptionText && process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key') {
        try {
          console.log('Usando OpenAI para generar el plan...');
          const openAIPlan = await generatePlan(transcriptionText);

          console.log('Plan generado con OpenAI correctamente');

          // Guardar el plan
          this.plans.set(openAIPlan.id, openAIPlan);

          return {
            success: true,
            plan: openAIPlan,
            metadata: {
              timestamp: new Date().toISOString(),
              objectivesCount: openAIPlan.objectives.length,
              tasksCount: openAIPlan.ganttData.tasks.length,
              service: 'openai'
            }
          };
        } catch (openAIError) {
          console.error('Error al generar plan con OpenAI:', openAIError);
          console.log('Usando generación local como fallback');
        }
      } else {
        console.log('No hay texto de transcripción o clave API de OpenAI, usando generación local');
      }

      // Generación local (fallback)
      console.log('Generando plan localmente...');

      const planId = uuidv4();
      const now = new Date();

      // Determinar la fecha de inicio y fin del plan
      const startDate = now.toISOString().split('T')[0];
      const endDate = this._calculateEndDate(tasks, this.defaultDuration);

      // Organizar tareas por objetivo
      const tasksByObjective = this._organizeTasksByObjective(objectives, tasks);

      // Crear estructura de plan
      const plan = {
        id: planId,
        name: `Plan generado el ${startDate}`,
        description: 'Plan generado automáticamente basado en objetivos y tareas de la reunión',
        startDate,
        endDate,
        objectives: objectives.map(objective => ({
          id: objective.id,
          text: objective.text,
          tasks: tasksByObjective[objective.id] || []
        })),
        unassignedTasks: tasksByObjective.unassigned || [],
        ganttData: this._generateGanttData(tasks, startDate)
      };

      // Guardar el plan
      this.plans.set(planId, plan);

      return {
        success: true,
        plan,
        metadata: {
          timestamp: new Date().toISOString(),
          objectivesCount: objectives.length,
          tasksCount: tasks.length,
          service: 'local'
        }
      };
    } catch (error) {
      console.error('Error al crear el plan:', error);
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
   * Genera datos para una carta Gantt
   * @param {Array} tasks - Lista de tareas
   * @returns {Promise<object>} - Datos de la carta Gantt
   */
  async generateGanttChart(tasks) {
    try {
      if (!tasks || tasks.length === 0) {
        throw new Error('Se requieren tareas para generar una carta Gantt');
      }

      const startDate = new Date();
      const ganttData = this._generateGanttData(tasks, startDate.toISOString().split('T')[0]);

      return {
        success: true,
        ganttData,
        metadata: {
          timestamp: new Date().toISOString(),
          tasksCount: tasks.length
        }
      };
    } catch (error) {
      console.error('Error al generar la carta Gantt:', error);
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
   * Obtiene un plan por su ID
   * @param {string} planId - ID del plan
   * @returns {object} - Plan encontrado
   */
  getPlan(planId) {
    if (!this.plans.has(planId)) {
      throw new Error(`Plan no encontrado: ${planId}`);
    }

    return this.plans.get(planId);
  }

  /**
   * Obtiene todos los planes
   * @returns {Array} - Lista de planes
   */
  getAllPlans() {
    return Array.from(this.plans.values());
  }

  /**
   * Calcula la fecha de fin basada en las tareas
   * @private
   */
  _calculateEndDate(tasks, defaultDuration) {
    // Si hay tareas con fechas de vencimiento, usar la más lejana
    if (tasks && tasks.length > 0) {
      const dueDates = tasks
        .filter(task => task.dueDate)
        .map(task => new Date(task.dueDate));

      if (dueDates.length > 0) {
        // Encontrar la fecha más lejana
        const latestDate = new Date(Math.max(...dueDates));
        return latestDate.toISOString().split('T')[0];
      }
    }

    // Si no hay fechas de vencimiento, usar la duración predeterminada
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + defaultDuration);
    return endDate.toISOString().split('T')[0];
  }

  /**
   * Organiza las tareas por objetivo
   * @private
   */
  _organizeTasksByObjective(objectives, tasks) {
    const tasksByObjective = {
      unassigned: []
    };

    // Inicializar arrays para cada objetivo
    objectives.forEach(objective => {
      tasksByObjective[objective.id] = [];
    });

    // Asignar tareas a objetivos
    tasks.forEach(task => {
      let assigned = false;

      // Buscar objetivo relacionado
      for (const objective of objectives) {
        if (objective.relatedTasks && objective.relatedTasks.includes(task.id)) {
          tasksByObjective[objective.id].push(task);
          assigned = true;
          break;
        }
      }

      // Si no se asignó a ningún objetivo, ponerlo en no asignados
      if (!assigned) {
        tasksByObjective.unassigned.push(task);
      }
    });

    return tasksByObjective;
  }

  /**
   * Genera datos para una carta Gantt
   * @private
   */
  _generateGanttData(tasks, startDate) {
    const ganttTasks = [];
    const dependencies = [];
    const startDateObj = new Date(startDate);

    // Ordenar tareas por fecha de vencimiento
    const sortedTasks = [...tasks].sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });

    // Crear tareas para el Gantt
    sortedTasks.forEach((task, index) => {
      // Calcular fechas de inicio y fin
      let taskStartDate;
      let taskEndDate;

      if (task.dueDate) {
        // Si tiene fecha de vencimiento, usar esa como fecha de fin
        taskEndDate = new Date(task.dueDate);

        // Estimar fecha de inicio (3 días antes por defecto)
        taskStartDate = new Date(taskEndDate);
        taskStartDate.setDate(taskEndDate.getDate() - 3);
      } else {
        // Si no tiene fecha, asignar fechas secuenciales
        taskStartDate = new Date(startDateObj);
        taskStartDate.setDate(startDateObj.getDate() + index * 2);

        taskEndDate = new Date(taskStartDate);
        taskEndDate.setDate(taskStartDate.getDate() + 3);
      }

      // Crear tarea para el Gantt
      ganttTasks.push({
        id: task.id,
        text: task.text,
        start_date: taskStartDate.toISOString().split('T')[0],
        end_date: taskEndDate.toISOString().split('T')[0],
        progress: task.status === 'DONE' ? 1 : (task.status === 'IN_PROGRESS' ? 0.5 : 0),
        assignee: task.assignee || 'Sin asignar'
      });

      // Crear dependencias simples (tareas secuenciales)
      if (index > 0) {
        dependencies.push({
          id: `${index}_${index-1}`,
          source: sortedTasks[index-1].id,
          target: task.id,
          type: 0 // Fin a inicio
        });
      }
    });

    return {
      tasks: ganttTasks,
      dependencies
    };
  }
}

export default PlannerAgent;

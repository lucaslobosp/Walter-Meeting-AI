/**
 * Modelo de Línea de Tiempo
 * 
 * Define la estructura de datos para las líneas de tiempo y cartas Gantt.
 */

class Timeline {
  constructor(data = {}) {
    this.id = data.id || null;
    this.name = data.name || 'Línea de tiempo sin nombre';
    this.description = data.description || '';
    this.startDate = data.startDate || new Date().toISOString().split('T')[0];
    this.endDate = data.endDate || null;
    this.tasks = data.tasks || [];
    this.dependencies = data.dependencies || [];
    this.meetingId = data.meetingId || null;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  /**
   * Valida los datos de la línea de tiempo
   * @returns {boolean} - Resultado de la validación
   */
  validate() {
    // Validaciones básicas
    if (!this.name || this.name.trim() === '') {
      return false;
    }
    
    // Validar fechas
    try {
      new Date(this.startDate);
      if (this.endDate) {
        new Date(this.endDate);
      }
    } catch (error) {
      return false;
    }
    
    // Validar que la fecha de fin sea posterior a la de inicio
    if (this.endDate && new Date(this.endDate) <= new Date(this.startDate)) {
      return false;
    }
    
    return true;
  }

  /**
   * Añade una tarea a la línea de tiempo
   * @param {object} task - Tarea a añadir
   * @returns {boolean} - Éxito de la operación
   */
  addTask(task) {
    if (!task || !task.id || !task.text) {
      return false;
    }
    
    // Verificar si la tarea ya existe
    const existingTaskIndex = this.tasks.findIndex(t => t.id === task.id);
    if (existingTaskIndex >= 0) {
      // Actualizar tarea existente
      this.tasks[existingTaskIndex] = {
        ...this.tasks[existingTaskIndex],
        ...task,
        updatedAt: new Date().toISOString()
      };
    } else {
      // Añadir nueva tarea
      this.tasks.push({
        ...task,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    
    this.updatedAt = new Date().toISOString();
    return true;
  }

  /**
   * Añade una dependencia entre tareas
   * @param {string} sourceTaskId - ID de la tarea origen
   * @param {string} targetTaskId - ID de la tarea destino
   * @param {number} type - Tipo de dependencia (0: fin-inicio, 1: inicio-inicio, 2: fin-fin, 3: inicio-fin)
   * @returns {boolean} - Éxito de la operación
   */
  addDependency(sourceTaskId, targetTaskId, type = 0) {
    // Verificar que las tareas existen
    const sourceTask = this.tasks.find(t => t.id === sourceTaskId);
    const targetTask = this.tasks.find(t => t.id === targetTaskId);
    
    if (!sourceTask || !targetTask) {
      return false;
    }
    
    // Verificar que no se crea una dependencia circular
    if (this._hasCyclicDependency(sourceTaskId, targetTaskId)) {
      return false;
    }
    
    // Crear ID único para la dependencia
    const dependencyId = `${sourceTaskId}_${targetTaskId}`;
    
    // Verificar si la dependencia ya existe
    const existingDependencyIndex = this.dependencies.findIndex(d => d.id === dependencyId);
    if (existingDependencyIndex >= 0) {
      // Actualizar dependencia existente
      this.dependencies[existingDependencyIndex] = {
        id: dependencyId,
        source: sourceTaskId,
        target: targetTaskId,
        type
      };
    } else {
      // Añadir nueva dependencia
      this.dependencies.push({
        id: dependencyId,
        source: sourceTaskId,
        target: targetTaskId,
        type
      });
    }
    
    this.updatedAt = new Date().toISOString();
    return true;
  }

  /**
   * Verifica si añadir una dependencia crearía un ciclo
   * @private
   */
  _hasCyclicDependency(sourceTaskId, targetTaskId) {
    // Verificar si la dependencia inversa ya existe
    const hasDirectCycle = this.dependencies.some(d => 
      d.source === targetTaskId && d.target === sourceTaskId
    );
    
    if (hasDirectCycle) {
      return true;
    }
    
    // Verificar ciclos más complejos (implementación simple)
    const visited = new Set();
    const stack = [targetTaskId];
    
    while (stack.length > 0) {
      const currentTaskId = stack.pop();
      
      if (currentTaskId === sourceTaskId) {
        return true; // Se encontró un ciclo
      }
      
      if (!visited.has(currentTaskId)) {
        visited.add(currentTaskId);
        
        // Añadir todas las tareas que dependen de la tarea actual
        this.dependencies.forEach(d => {
          if (d.source === currentTaskId) {
            stack.push(d.target);
          }
        });
      }
    }
    
    return false;
  }

  /**
   * Calcula la duración total de la línea de tiempo
   * @returns {number} - Duración en días
   */
  calculateDuration() {
    if (!this.endDate) {
      // Calcular fecha de fin basada en las tareas
      const taskEndDates = this.tasks
        .filter(task => task.end_date)
        .map(task => new Date(task.end_date));
      
      if (taskEndDates.length > 0) {
        const latestDate = new Date(Math.max(...taskEndDates));
        this.endDate = latestDate.toISOString().split('T')[0];
      } else {
        // Si no hay fechas de fin, usar 30 días desde la fecha de inicio
        const endDate = new Date(this.startDate);
        endDate.setDate(endDate.getDate() + 30);
        this.endDate = endDate.toISOString().split('T')[0];
      }
    }
    
    // Calcular duración
    const startDate = new Date(this.startDate);
    const endDate = new Date(this.endDate);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  /**
   * Convierte el objeto a JSON
   * @returns {object} - Representación JSON
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      startDate: this.startDate,
      endDate: this.endDate || this.calculateEndDate(),
      tasks: this.tasks,
      dependencies: this.dependencies,
      meetingId: this.meetingId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      duration: this.calculateDuration()
    };
  }

  /**
   * Calcula la fecha de fin basada en las tareas
   * @private
   */
  calculateEndDate() {
    const taskEndDates = this.tasks
      .filter(task => task.end_date)
      .map(task => new Date(task.end_date));
    
    if (taskEndDates.length > 0) {
      const latestDate = new Date(Math.max(...taskEndDates));
      return latestDate.toISOString().split('T')[0];
    } else {
      // Si no hay fechas de fin, usar 30 días desde la fecha de inicio
      const endDate = new Date(this.startDate);
      endDate.setDate(endDate.getDate() + 30);
      return endDate.toISOString().split('T')[0];
    }
  }

  /**
   * Crea una instancia a partir de JSON
   * @param {object} json - Datos JSON
   * @returns {Timeline} - Instancia de Timeline
   */
  static fromJSON(json) {
    return new Timeline(json);
  }
}

export default Timeline;

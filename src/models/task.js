/**
 * Modelo de Tarea
 * 
 * Define la estructura de datos para las tareas.
 */

class Task {
  constructor(data = {}) {
    this.id = data.id || null;
    this.text = data.text || '';
    this.status = data.status || 'TODO'; // TODO, IN_PROGRESS, DONE, BLOCKED
    this.assignee = data.assignee || 'Sin asignar';
    this.dueDate = data.dueDate || null;
    this.meetingId = data.meetingId || null;
    this.objectiveId = data.objectiveId || null;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.completedAt = data.completedAt || null;
  }

  /**
   * Valida los datos de la tarea
   * @returns {boolean} - Resultado de la validación
   */
  validate() {
    // Validaciones básicas
    if (!this.text || this.text.trim() === '') {
      return false;
    }
    
    // Validar estado
    const validStatuses = ['TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED'];
    if (!validStatuses.includes(this.status)) {
      return false;
    }
    
    // Validar fecha de vencimiento
    if (this.dueDate) {
      try {
        new Date(this.dueDate);
      } catch (error) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Actualiza el estado de la tarea
   * @param {string} status - Nuevo estado
   * @returns {boolean} - Éxito de la operación
   */
  updateStatus(status) {
    const validStatuses = ['TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED'];
    if (!validStatuses.includes(status)) {
      return false;
    }
    
    this.status = status;
    this.updatedAt = new Date().toISOString();
    
    if (status === 'DONE' && !this.completedAt) {
      this.completedAt = new Date().toISOString();
    } else if (status !== 'DONE') {
      this.completedAt = null;
    }
    
    return true;
  }

  /**
   * Asigna la tarea a un responsable
   * @param {string} assignee - Nombre del responsable
   * @returns {boolean} - Éxito de la operación
   */
  assign(assignee) {
    if (!assignee || assignee.trim() === '') {
      return false;
    }
    
    this.assignee = assignee;
    this.updatedAt = new Date().toISOString();
    return true;
  }

  /**
   * Establece la fecha de vencimiento
   * @param {string} dueDate - Fecha de vencimiento (ISO string)
   * @returns {boolean} - Éxito de la operación
   */
  setDueDate(dueDate) {
    try {
      new Date(dueDate);
      this.dueDate = dueDate;
      this.updatedAt = new Date().toISOString();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Convierte el objeto a JSON
   * @returns {object} - Representación JSON
   */
  toJSON() {
    return {
      id: this.id,
      text: this.text,
      status: this.status,
      assignee: this.assignee,
      dueDate: this.dueDate,
      meetingId: this.meetingId,
      objectiveId: this.objectiveId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      completedAt: this.completedAt
    };
  }

  /**
   * Crea una instancia a partir de JSON
   * @param {object} json - Datos JSON
   * @returns {Task} - Instancia de Task
   */
  static fromJSON(json) {
    return new Task(json);
  }
}

export default Task;

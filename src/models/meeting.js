/**
 * Modelo de Reunión
 * 
 * Define la estructura de datos para las reuniones.
 */

class Meeting {
  constructor(data = {}) {
    this.id = data.id || null;
    this.title = data.title || 'Reunión sin título';
    this.date = data.date || new Date().toISOString();
    this.participants = data.participants || [];
    this.audioFile = data.audioFile || null;
    this.transcription = data.transcription || null;
    this.analysis = data.analysis || null;
    this.summary = data.summary || null;
    this.objectives = data.objectives || [];
    this.tasks = data.tasks || [];
    this.plan = data.plan || null;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  /**
   * Valida los datos de la reunión
   * @returns {boolean} - Resultado de la validación
   */
  validate() {
    // Validaciones básicas
    if (!this.title || this.title.trim() === '') {
      return false;
    }
    
    // Validar fecha
    try {
      new Date(this.date);
    } catch (error) {
      return false;
    }
    
    return true;
  }

  /**
   * Convierte el objeto a JSON
   * @returns {object} - Representación JSON
   */
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      date: this.date,
      participants: this.participants,
      audioFile: this.audioFile,
      transcription: this.transcription ? true : false, // No incluir la transcripción completa
      analysis: this.analysis ? true : false, // No incluir el análisis completo
      summary: this.summary,
      objectives: this.objectives,
      tasks: this.tasks,
      plan: this.plan ? this.plan.id : null,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Crea una instancia a partir de JSON
   * @param {object} json - Datos JSON
   * @returns {Meeting} - Instancia de Meeting
   */
  static fromJSON(json) {
    return new Meeting(json);
  }
}

export default Meeting;

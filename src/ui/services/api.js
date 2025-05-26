/**
 * Servicios para comunicación con la API
 */

// Determinar la URL base de la API dinámicamente
function getApiBaseUrl() {
  // Obtener el host actual (incluye el protocolo, dominio y puerto)
  const currentHost = window.location.origin;

  // Si estamos en localhost, usar la URL local
  if (currentHost.includes('localhost') || currentHost.includes('127.0.0.1')) {
    return 'http://localhost:3001/api';
  }

  // Si estamos en ngrok o cualquier otro host, usar la misma base pero con /api
  return `${currentHost}/api`;
}

// URL base de la API
const API_BASE_URL = getApiBaseUrl();

/**
 * Sube un archivo de audio a la API
 * @param {File} file - Archivo de audio a subir
 * @returns {Promise<object>} - Respuesta de la API
 */
export async function uploadAudio(file) {
  try {
    const formData = new FormData();
    formData.append('audio', file);

    const response = await fetch(`${API_BASE_URL}/meetings/upload`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al subir el archivo de audio');
    }

    return await response.json();
  } catch (error) {
    console.error('Error en uploadAudio:', error);
    throw error;
  }
}

/**
 * Obtiene la lista de reuniones
 * @returns {Promise<Array>} - Lista de reuniones
 */
export async function getMeetings() {
  try {
    const response = await fetch(`${API_BASE_URL}/meetings`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al obtener la lista de reuniones');
    }

    const data = await response.json();
    return data.meetings || [];
  } catch (error) {
    console.error('Error en getMeetings:', error);
    throw error;
  }
}

/**
 * Obtiene los detalles de una reunión
 * @param {string} meetingId - ID de la reunión
 * @returns {Promise<object>} - Detalles de la reunión
 */
export async function getMeetingDetails(meetingId) {
  try {
    const response = await fetch(`${API_BASE_URL}/meetings/${meetingId}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al obtener los detalles de la reunión');
    }

    return await response.json();
  } catch (error) {
    console.error('Error en getMeetingDetails:', error);
    throw error;
  }
}

/**
 * Obtiene la transcripción de una reunión
 * @param {string} meetingId - ID de la reunión
 * @returns {Promise<object>} - Transcripción de la reunión
 */
export async function getTranscription(meetingId) {
  try {
    const response = await fetch(`${API_BASE_URL}/meetings/${meetingId}/transcription`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al obtener la transcripción');
    }

    return await response.json();
  } catch (error) {
    console.error('Error en getTranscription:', error);
    throw error;
  }
}

/**
 * Obtiene el resumen de una reunión
 * @param {string} meetingId - ID de la reunión
 * @returns {Promise<object>} - Resumen de la reunión
 */
export async function getSummary(meetingId) {
  try {
    const response = await fetch(`${API_BASE_URL}/meetings/${meetingId}/summary`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al obtener el resumen');
    }

    return await response.json();
  } catch (error) {
    console.error('Error en getSummary:', error);
    throw error;
  }
}

/**
 * Obtiene el análisis de una reunión
 * @param {string} meetingId - ID de la reunión
 * @returns {Promise<object>} - Análisis de la reunión
 */
export async function getAnalysis(meetingId) {
  try {
    const response = await fetch(`${API_BASE_URL}/meetings/${meetingId}/analysis`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al obtener el análisis');
    }

    return await response.json();
  } catch (error) {
    console.error('Error en getAnalysis:', error);
    throw error;
  }
}

/**
 * Obtiene el plan de una reunión
 * @param {string} meetingId - ID de la reunión
 * @returns {Promise<object>} - Plan de la reunión
 */
export async function getPlan(meetingId) {
  try {
    const response = await fetch(`${API_BASE_URL}/meetings/${meetingId}/plan`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al obtener el plan');
    }

    return await response.json();
  } catch (error) {
    console.error('Error en getPlan:', error);
    throw error;
  }
}

/**
 * Descarga un informe completo de la reunión en formato Word
 * @param {string} meetingId - ID de la reunión
 */
export async function downloadReport(meetingId) {
  try {
    console.log('Solicitando informe Word para la reunión:', meetingId);

    // Crear un elemento <a> temporal para la descarga
    const link = document.createElement('a');
    link.href = `${API_BASE_URL}/meetings/${meetingId}/report`;
    link.download = `Informe_Reunion_${meetingId}.docx`;
    link.target = '_blank';

    // Añadir el elemento al DOM, hacer clic y luego eliminarlo
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return true;
  } catch (error) {
    console.error('Error al descargar el informe:', error);
    throw error;
  }
}

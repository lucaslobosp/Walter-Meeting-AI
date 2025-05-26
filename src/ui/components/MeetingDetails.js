/**
 * Componente para mostrar los detalles de una reunión
 */

import { getMeetingDetails, getTranscription, getSummary, getAnalysis, getPlan, downloadReport } from '../services/api.js';
import { renderTranscription } from './Transcription.js';
import { renderSummary } from './Summary.js';
import { renderAnalysis } from './Analysis.js';
import { renderGanttChart } from './GanttChart.js';

export function setupMeetingDetails() {
  // Elementos del DOM
  const meetingTitle = document.getElementById('meeting-title');
  const transcriptionContent = document.getElementById('transcription-content');
  const summaryContent = document.getElementById('summary-content');
  const analysisContent = document.getElementById('analysis-content');
  const planContent = document.getElementById('plan-content');
  const downloadReportBtn = document.getElementById('download-report-btn');

  // Configurar botón de descarga de informe
  let currentMeetingId = null;

  downloadReportBtn.addEventListener('click', async () => {
    if (!currentMeetingId) {
      console.error('No hay una reunión cargada actualmente');
      return;
    }

    try {
      console.log('Descargando informe para la reunión:', currentMeetingId);
      downloadReportBtn.disabled = true;
      downloadReportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';

      await downloadReport(currentMeetingId);

      // Restaurar el botón después de la descarga
      setTimeout(() => {
        downloadReportBtn.disabled = false;
        downloadReportBtn.innerHTML = '<i class="fas fa-file-word"></i> Descargar Informe';
      }, 1000);
    } catch (error) {
      console.error('Error al descargar el informe:', error);
      alert('Error al descargar el informe: ' + error.message);
      downloadReportBtn.disabled = false;
      downloadReportBtn.innerHTML = '<i class="fas fa-file-word"></i> Descargar Informe';
    }
  });

  // Escuchar evento para cargar los detalles de una reunión
  document.addEventListener('load-meeting-details', async (event) => {
    const { meetingId } = event.detail;
    currentMeetingId = meetingId;
    console.log('Cargando detalles de la reunión:', meetingId);

    try {
      // Actualizar título
      meetingTitle.textContent = `Reunión ${meetingId.substring(0, 8)}...`;

      // Cargar detalles de la reunión
      console.log('Solicitando detalles al servidor...');
      const meetingDetails = await getMeetingDetails(meetingId);
      console.log('Detalles recibidos:', meetingDetails);

      // Verificar estado de la reunión
      if (meetingDetails.status === 'processing') {
        console.log('La reunión aún está siendo procesada');
        // La reunión aún está siendo procesada
        showProcessingState(meetingId);
        return;
      } else if (meetingDetails.status === 'failed') {
        console.log('La reunión falló:', meetingDetails.error);
        // La reunión falló
        showErrorState(meetingDetails.error || 'Error desconocido al procesar la reunión');
        return;
      }

      console.log('La reunión se procesó correctamente, cargando contenido...');
      // Cargar contenido de las pestañas
      loadTabContents(meetingId);
    } catch (error) {
      console.error('Error al cargar los detalles de la reunión:', error);
      showErrorState(error.message || 'Error al cargar los detalles de la reunión');
    }
  });

  // Función para mostrar el estado de procesamiento
  function showProcessingState(meetingId) {
    const processingHTML = `
      <div class="text-center p-4">
        <div class="loading">
          <div class="loading-spinner"></div>
        </div>
        <p class="mt-4">La reunión está siendo procesada. Este proceso puede tardar varios minutos.</p>
        <button class="btn btn-primary mt-4" id="refresh-meeting-btn">
          Actualizar estado
        </button>
      </div>
    `;

    transcriptionContent.innerHTML = processingHTML;
    summaryContent.innerHTML = processingHTML;
    analysisContent.innerHTML = processingHTML;
    planContent.innerHTML = processingHTML;

    // Configurar botón para actualizar estado
    const refreshButtons = document.querySelectorAll('#refresh-meeting-btn');
    refreshButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Disparar evento para recargar los detalles
        const meetingDetailsEvent = new CustomEvent('load-meeting-details', {
          detail: { meetingId }
        });
        document.dispatchEvent(meetingDetailsEvent);
      });
    });

    // Actualizar automáticamente después de 3 segundos
    console.log('Configurando actualización automática...');
    setTimeout(() => {
      console.log('Actualizando automáticamente...');
      const meetingDetailsEvent = new CustomEvent('load-meeting-details', {
        detail: { meetingId }
      });
      document.dispatchEvent(meetingDetailsEvent);
    }, 3000);
  }

  // Función para mostrar el estado de error
  function showErrorState(errorMessage) {
    const errorHTML = `
      <div class="alert alert-danger">
        <i class="fas fa-exclamation-circle"></i> ${errorMessage}
      </div>
    `;

    transcriptionContent.innerHTML = errorHTML;
    summaryContent.innerHTML = errorHTML;
    analysisContent.innerHTML = errorHTML;
    planContent.innerHTML = errorHTML;
  }

  // Función para cargar el contenido de las pestañas
  async function loadTabContents(meetingId) {
    try {
      // Cargar transcripción
      loadTranscription(meetingId);

      // Cargar resumen
      loadSummary(meetingId);

      // Cargar análisis
      loadAnalysis(meetingId);

      // Cargar plan
      loadPlan(meetingId);
    } catch (error) {
      console.error('Error al cargar el contenido de las pestañas:', error);
    }
  }

  // Función para cargar la transcripción
  async function loadTranscription(meetingId) {
    try {
      transcriptionContent.innerHTML = `
        <div class="loading">
          <div class="loading-spinner"></div>
        </div>
      `;

      const transcription = await getTranscription(meetingId);

      if (!transcription || !transcription.success) {
        transcriptionContent.innerHTML = `
          <div class="alert alert-warning">
            <i class="fas fa-exclamation-triangle"></i> No se pudo cargar la transcripción.
          </div>
        `;
        return;
      }

      // Renderizar transcripción
      renderTranscription(transcriptionContent, transcription);
    } catch (error) {
      console.error('Error al cargar la transcripción:', error);
      transcriptionContent.innerHTML = `
        <div class="alert alert-danger">
          <i class="fas fa-exclamation-circle"></i> Error al cargar la transcripción: ${error.message}
        </div>
      `;
    }
  }

  // Función para cargar el resumen
  async function loadSummary(meetingId) {
    try {
      summaryContent.innerHTML = `
        <div class="loading">
          <div class="loading-spinner"></div>
        </div>
      `;

      const summary = await getSummary(meetingId);

      if (!summary || !summary.success) {
        summaryContent.innerHTML = `
          <div class="alert alert-warning">
            <i class="fas fa-exclamation-triangle"></i> No se pudo cargar el resumen.
          </div>
        `;
        return;
      }

      // Renderizar resumen
      renderSummary(summaryContent, summary);
    } catch (error) {
      console.error('Error al cargar el resumen:', error);
      summaryContent.innerHTML = `
        <div class="alert alert-danger">
          <i class="fas fa-exclamation-circle"></i> Error al cargar el resumen: ${error.message}
        </div>
      `;
    }
  }

  // Función para cargar el análisis
  async function loadAnalysis(meetingId) {
    try {
      analysisContent.innerHTML = `
        <div class="loading">
          <div class="loading-spinner"></div>
        </div>
      `;

      const analysis = await getAnalysis(meetingId);

      if (!analysis || !analysis.success) {
        analysisContent.innerHTML = `
          <div class="alert alert-warning">
            <i class="fas fa-exclamation-triangle"></i> No se pudo cargar el análisis.
          </div>
        `;
        return;
      }

      // Renderizar análisis
      renderAnalysis(analysisContent, analysis);
    } catch (error) {
      console.error('Error al cargar el análisis:', error);
      analysisContent.innerHTML = `
        <div class="alert alert-danger">
          <i class="fas fa-exclamation-circle"></i> Error al cargar el análisis: ${error.message}
        </div>
      `;
    }
  }

  // Función para cargar el plan
  async function loadPlan(meetingId) {
    try {
      planContent.innerHTML = `
        <div class="loading">
          <div class="loading-spinner"></div>
        </div>
      `;

      const plan = await getPlan(meetingId);

      if (!plan || !plan.success) {
        planContent.innerHTML = `
          <div class="alert alert-warning">
            <i class="fas fa-exclamation-triangle"></i> No se pudo cargar el plan.
          </div>
        `;
        return;
      }

      // Renderizar plan y carta Gantt
      renderGanttChart(planContent, plan);
    } catch (error) {
      console.error('Error al cargar el plan:', error);
      planContent.innerHTML = `
        <div class="alert alert-danger">
          <i class="fas fa-exclamation-circle"></i> Error al cargar el plan: ${error.message}
        </div>
      `;
    }
  }
}

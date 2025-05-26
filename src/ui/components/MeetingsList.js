/**
 * Componente para listar las reuniones
 */

import { getMeetings } from '../services/api.js';
import { showView } from './Navigation.js';

export function setupMeetingsList() {
  const meetingsListContainer = document.getElementById('meetings-list-container');
  
  // Escuchar evento para cargar la lista de reuniones
  document.addEventListener('load-meetings', loadMeetings);
  
  // Función para cargar la lista de reuniones
  async function loadMeetings() {
    try {
      // Mostrar cargando
      meetingsListContainer.innerHTML = `
        <div class="loading">
          <div class="loading-spinner"></div>
        </div>
      `;
      
      // Obtener reuniones
      const meetings = await getMeetings();
      
      // Verificar si hay reuniones
      if (meetings.length === 0) {
        meetingsListContainer.innerHTML = `
          <div class="text-center p-4">
            <i class="fas fa-info-circle text-primary text-lg"></i>
            <p class="mt-2">No hay reuniones procesadas todavía.</p>
            <button class="btn btn-primary mt-4" id="upload-first-meeting-btn">
              Subir primera reunión
            </button>
          </div>
        `;
        
        // Configurar botón para subir primera reunión
        document.getElementById('upload-first-meeting-btn').addEventListener('click', () => {
          document.getElementById('nav-upload').click();
        });
        
        return;
      }
      
      // Renderizar lista de reuniones
      const meetingsList = document.createElement('ul');
      meetingsList.className = 'meetings-list';
      
      meetings.forEach(meeting => {
        const meetingItem = document.createElement('li');
        meetingItem.className = 'meeting-item';
        
        // Determinar el estado de la reunión
        let statusBadge = '';
        if (meeting.status === 'completed') {
          statusBadge = '<span class="badge badge-success">Completado</span>';
        } else if (meeting.status === 'processing') {
          statusBadge = '<span class="badge badge-warning">Procesando</span>';
        } else if (meeting.status === 'failed') {
          statusBadge = '<span class="badge badge-danger">Error</span>';
        }
        
        // Formatear fecha
        const date = new Date(meeting.timestamp);
        const formattedDate = date.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        meetingItem.innerHTML = `
          <div>
            <div class="meeting-title">Reunión ${meeting.meetingId.substring(0, 8)}... ${statusBadge}</div>
            <div class="meeting-date">${formattedDate}</div>
          </div>
          <button class="btn btn-outline view-meeting-btn" data-meeting-id="${meeting.meetingId}">
            Ver detalles
          </button>
        `;
        
        meetingsList.appendChild(meetingItem);
      });
      
      // Reemplazar contenido del contenedor
      meetingsListContainer.innerHTML = '';
      meetingsListContainer.appendChild(meetingsList);
      
      // Configurar botones para ver detalles de reunión
      const viewButtons = document.querySelectorAll('.view-meeting-btn');
      viewButtons.forEach(button => {
        button.addEventListener('click', () => {
          const meetingId = button.getAttribute('data-meeting-id');
          
          // Navegar a la vista de detalles
          showView('meeting-details-view');
          
          // Disparar evento para cargar los detalles de la reunión
          const meetingDetailsEvent = new CustomEvent('load-meeting-details', {
            detail: { meetingId }
          });
          document.dispatchEvent(meetingDetailsEvent);
        });
      });
    } catch (error) {
      console.error('Error al cargar la lista de reuniones:', error);
      meetingsListContainer.innerHTML = `
        <div class="alert alert-danger">
          <i class="fas fa-exclamation-circle"></i> Error al cargar las reuniones: ${error.message}
        </div>
        <button class="btn btn-primary mt-4" id="retry-load-meetings-btn">
          Intentar de nuevo
        </button>
      `;
      
      // Configurar botón para reintentar
      document.getElementById('retry-load-meetings-btn').addEventListener('click', loadMeetings);
    }
  }
}

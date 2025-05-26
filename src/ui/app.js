/**
 * Aplicación principal para la interfaz de usuario
 */

import { setupNavigation } from './components/Navigation.js';
import { setupAudioUploader } from './components/AudioUploader.js';
import { setupMeetingsList } from './components/MeetingsList.js';
import { setupMeetingDetails } from './components/MeetingDetails.js';

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  console.log('Inicializando aplicación...');

  // Configurar navegación
  setupNavigation();

  // Configurar componentes
  setupAudioUploader();
  setupMeetingsList();
  setupMeetingDetails();

  // Configurar botones de la página de inicio
  document.getElementById('get-started-btn').addEventListener('click', () => {
    document.getElementById('nav-upload').click();
  });

  document.getElementById('learn-more-btn').addEventListener('click', () => {
    window.open('https://github.com/yourusername/walter-meeting', '_blank');
  });

  console.log('Aplicación inicializada correctamente');
});

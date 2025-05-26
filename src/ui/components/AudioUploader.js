/**
 * Componente para subir archivos de audio
 */

import { uploadAudio } from '../services/api.js';
import { showView } from './Navigation.js';

export function setupAudioUploader() {
  const uploader = document.getElementById('audio-uploader');
  const fileInput = document.getElementById('audio-file-input');
  const uploadProgress = document.getElementById('upload-progress');
  const uploadSuccess = document.getElementById('upload-success');
  const uploadError = document.getElementById('upload-error');
  const errorMessage = document.getElementById('error-message');
  
  // Configurar eventos de arrastrar y soltar
  uploader.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploader.classList.add('uploader-dragover');
  });
  
  uploader.addEventListener('dragleave', () => {
    uploader.classList.remove('uploader-dragover');
  });
  
  uploader.addEventListener('drop', (e) => {
    e.preventDefault();
    uploader.classList.remove('uploader-dragover');
    
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });
  
  // Configurar evento de clic para seleccionar archivo
  uploader.addEventListener('click', () => {
    fileInput.click();
  });
  
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      handleFile(fileInput.files[0]);
    }
  });
  
  // Función para manejar el archivo seleccionado
  async function handleFile(file) {
    // Validar que sea un archivo de audio
    const validTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a'];
    if (!validTypes.includes(file.type)) {
      showError('El archivo seleccionado no es un archivo de audio válido.');
      return;
    }
    
    // Validar tamaño máximo (50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB en bytes
    if (file.size > maxSize) {
      showError('El archivo es demasiado grande. El tamaño máximo permitido es 50MB.');
      return;
    }
    
    try {
      // Mostrar progreso
      uploader.style.display = 'none';
      uploadProgress.style.display = 'block';
      uploadSuccess.style.display = 'none';
      uploadError.style.display = 'none';
      
      // Subir archivo
      const result = await uploadAudio(file);
      
      // Mostrar éxito
      uploadProgress.style.display = 'none';
      uploadSuccess.style.display = 'block';
      
      // Esperar 2 segundos y redirigir a la vista de detalles
      setTimeout(() => {
        // Navegar a la vista de detalles de la reunión
        showView('meeting-details-view');
        
        // Disparar evento para cargar los detalles de la reunión
        const meetingDetailsEvent = new CustomEvent('load-meeting-details', {
          detail: { meetingId: result.meetingId }
        });
        document.dispatchEvent(meetingDetailsEvent);
        
        // Resetear el uploader para futuras subidas
        resetUploader();
      }, 2000);
    } catch (error) {
      console.error('Error al subir el archivo:', error);
      showError(error.message || 'Error al subir el archivo. Por favor, inténtalo de nuevo.');
    }
  }
  
  // Función para mostrar error
  function showError(message) {
    uploadProgress.style.display = 'none';
    uploadSuccess.style.display = 'none';
    uploadError.style.display = 'block';
    errorMessage.textContent = message;
    
    // Resetear el uploader después de 3 segundos
    setTimeout(resetUploader, 3000);
  }
  
  // Función para resetear el uploader
  function resetUploader() {
    uploader.style.display = 'block';
    uploadProgress.style.display = 'none';
    uploadSuccess.style.display = 'none';
    uploadError.style.display = 'none';
    fileInput.value = '';
  }
}

/**
 * Componente para renderizar la transcripción
 */

export function renderTranscription(container, transcriptionData) {
  // Verificar si hay datos de transcripción
  if (!transcriptionData || !transcriptionData.transcription) {
    container.innerHTML = `
      <div class="alert alert-warning">
        <i class="fas fa-exclamation-triangle"></i> No hay datos de transcripción disponibles.
      </div>
    `;
    return;
  }
  
  const transcription = transcriptionData.transcription;
  
  // Crear contenedor para la transcripción
  const transcriptionElement = document.createElement('div');
  transcriptionElement.className = 'transcription';
  
  // Determinar el formato de la transcripción
  if (typeof transcription === 'string') {
    // Formato simple: texto plano
    transcriptionElement.textContent = transcription;
  } else if (transcription.text) {
    // Formato Whisper
    transcriptionElement.textContent = transcription.text;
  } else if (transcription.results) {
    // Formato Google Speech
    let formattedText = '';
    
    // Procesar resultados
    transcription.results.forEach(result => {
      const transcript = result.alternatives[0].transcript;
      
      // Si hay información de hablantes
      if (result.alternatives[0].words && result.alternatives[0].words.length > 0) {
        const speakerGroups = groupBySpeaker(result.alternatives[0].words);
        
        speakerGroups.forEach(group => {
          formattedText += `<span class="transcription-speaker">Hablante ${group.speakerId}:</span> ${group.text}<br><br>`;
        });
      } else {
        formattedText += `${transcript}<br><br>`;
      }
    });
    
    transcriptionElement.innerHTML = formattedText;
  } else {
    // Formato desconocido
    transcriptionElement.textContent = JSON.stringify(transcription, null, 2);
  }
  
  // Limpiar y añadir al contenedor
  container.innerHTML = '';
  container.appendChild(transcriptionElement);
  
  // Añadir información de metadatos
  if (transcriptionData.metadata) {
    const metadataElement = document.createElement('div');
    metadataElement.className = 'mt-4 text-light text-sm';
    
    const timestamp = new Date(transcriptionData.metadata.timestamp);
    const formattedDate = timestamp.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    metadataElement.innerHTML = `
      <p>Transcripción generada el ${formattedDate}</p>
      <p>Servicio utilizado: ${transcriptionData.metadata.service || 'No especificado'}</p>
    `;
    
    container.appendChild(metadataElement);
  }
}

// Función auxiliar para agrupar palabras por hablante
function groupBySpeaker(words) {
  const groups = [];
  let currentGroup = null;
  
  words.forEach(word => {
    const speakerId = word.speakerTag || 0;
    
    if (!currentGroup || currentGroup.speakerId !== speakerId) {
      if (currentGroup) {
        groups.push(currentGroup);
      }
      
      currentGroup = {
        speakerId,
        text: word.word
      };
    } else {
      currentGroup.text += ' ' + word.word;
    }
  });
  
  if (currentGroup) {
    groups.push(currentGroup);
  }
  
  return groups;
}

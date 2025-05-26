/**
 * Componente de navegación
 */

// Función para mostrar una vista y ocultar las demás
export function showView(viewId) {
  // Ocultar todas las vistas
  const views = ['home-view', 'upload-view', 'meetings-view', 'meeting-details-view'];
  views.forEach(view => {
    document.getElementById(view).style.display = 'none';
  });
  
  // Mostrar la vista seleccionada
  document.getElementById(viewId).style.display = 'block';
}

// Configurar la navegación
export function setupNavigation() {
  // Configurar enlaces de navegación
  document.getElementById('nav-home').addEventListener('click', (e) => {
    e.preventDefault();
    showView('home-view');
  });
  
  document.getElementById('nav-meetings').addEventListener('click', (e) => {
    e.preventDefault();
    showView('meetings-view');
    // Cargar la lista de reuniones
    const meetingsListEvent = new CustomEvent('load-meetings');
    document.dispatchEvent(meetingsListEvent);
  });
  
  document.getElementById('nav-upload').addEventListener('click', (e) => {
    e.preventDefault();
    showView('upload-view');
  });
  
  // Configurar botón de volver a la lista de reuniones
  document.getElementById('back-to-meetings-btn').addEventListener('click', () => {
    document.getElementById('nav-meetings').click();
  });
  
  // Configurar pestañas en la vista de detalles de reunión
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Desactivar todas las pestañas
      tabs.forEach(t => t.classList.remove('active'));
      
      // Activar la pestaña seleccionada
      tab.classList.add('active');
      
      // Ocultar todos los contenidos de pestañas
      const tabContents = document.querySelectorAll('.tab-content');
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Mostrar el contenido de la pestaña seleccionada
      const tabId = tab.getAttribute('data-tab');
      document.getElementById(`${tabId}-tab`).classList.add('active');
    });
  });
}

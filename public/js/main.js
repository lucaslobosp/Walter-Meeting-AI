/**
 * Script principal para la interfaz de usuario
 */
document.addEventListener('DOMContentLoaded', function() {
  // Referencias a elementos del DOM
  const header = document.getElementById('main-header');
  const menuToggle = document.getElementById('menu-toggle');
  const mainMenu = document.getElementById('main-menu');
  const logoLink = document.getElementById('logo-link');

  // Botones de navegación
  const navLinks = {
    home: document.getElementById('nav-home'),
    meetings: document.getElementById('nav-meetings'),
    upload: document.getElementById('nav-upload'),
    dashboard: document.getElementById('nav-dashboard')
  };

  // Botones de acción en la página de inicio
  const actionButtons = {
    getStarted: document.getElementById('get-started-btn'),
    learnMore: document.getElementById('learn-more-btn'),
    ctaUpload: document.getElementById('cta-upload-btn'),
    ctaDemo: document.getElementById('cta-demo-btn')
  };

  // Enlaces del footer
  const footerLinks = {
    home: document.getElementById('footer-home'),
    meetings: document.getElementById('footer-meetings'),
    upload: document.getElementById('footer-upload'),
    dashboard: document.getElementById('footer-dashboard')
  };

  // Vistas
  const views = {
    home: document.getElementById('home-view'),
    upload: document.getElementById('upload-view'),
    meetings: document.getElementById('meetings-view'),
    meeting: document.getElementById('meeting-view')
  };

  /**
   * Maneja el efecto de scroll en el header
   */
  function handleHeaderScroll() {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }

  /**
   * Alterna la visibilidad del menú móvil
   */
  function toggleMobileMenu() {
    mainMenu.classList.toggle('active');

    // Cambiar el icono del botón
    const icon = menuToggle.querySelector('i');
    if (mainMenu.classList.contains('active')) {
      icon.classList.remove('fa-bars');
      icon.classList.add('fa-times');
      menuToggle.setAttribute('aria-label', 'Cerrar menú');
    } else {
      icon.classList.remove('fa-times');
      icon.classList.add('fa-bars');
      menuToggle.setAttribute('aria-label', 'Abrir menú');
    }
  }

  /**
   * Cambia la vista activa
   * @param {string} viewId - ID de la vista a mostrar
   */
  function changeView(viewId) {
    // Ocultar todas las vistas
    Object.values(views).forEach(view => {
      if (view) view.style.display = 'none';
    });

    // Mostrar la vista seleccionada
    if (views[viewId]) {
      views[viewId].style.display = 'block';
    }

    // Actualizar navegación
    Object.values(navLinks).forEach(link => {
      if (link) link.classList.remove('nav-active');
    });

    if (navLinks[viewId]) {
      navLinks[viewId].classList.add('nav-active');
    }

    // Cerrar menú móvil si está abierto
    if (mainMenu.classList.contains('active')) {
      toggleMobileMenu();
    }

    // Scroll al inicio
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Event Listeners
  window.addEventListener('scroll', handleHeaderScroll);
  menuToggle.addEventListener('click', toggleMobileMenu);

  // Navegación
  logoLink.addEventListener('click', (e) => {
    e.preventDefault();
    changeView('home');
  });

  // Enlaces de navegación
  Object.entries(navLinks).forEach(([viewId, link]) => {
    if (link) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        changeView(viewId);
      });
    }
  });

  // Enlaces del footer
  Object.entries(footerLinks).forEach(([viewId, link]) => {
    if (link) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        changeView(viewId);
      });
    }
  });

  // Botones de acción
  if (actionButtons.getStarted) {
    actionButtons.getStarted.addEventListener('click', () => {
      changeView('upload');
    });
  }

  if (actionButtons.ctaUpload) {
    actionButtons.ctaUpload.addEventListener('click', () => {
      changeView('upload');
    });
  }

  if (actionButtons.learnMore) {
    actionButtons.learnMore.addEventListener('click', () => {
      // Scroll a la sección de características
      const featuresSection = document.querySelector('.features-section');
      if (featuresSection) {
        featuresSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  if (actionButtons.ctaDemo) {
    actionButtons.ctaDemo.addEventListener('click', () => {
      // Mostrar un modal o alerta con un mensaje de demo
      alert('La demo estará disponible próximamente. ¡Gracias por su interés!');
    });
  }

  // Inicializar la vista de inicio por defecto
  changeView('home');
});

import { FirebaseManager } from './firebase-manager.js';
import { DataManager } from './data-manager.js';

class PartyRegistrationApp {
  constructor() {
    this.firebaseManager = new FirebaseManager();
    this.dataManager = new DataManager();
    this.currentGuests = [];
    this.isOnlineMode = false;
    
    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.loadInitialData();
    this.updateUI();
    
    // Mostrar configuración si es la primera vez
    if (!localStorage.getItem('appConfigured')) {
      this.showConfig();
    }
  }

  setupEventListeners() {
    document.getElementById('registration-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.registerGuest();
    });
  }

  async loadInitialData() {
    try {
      // Intentar cargar desde Firebase primero
      const firebaseConfig = await this.loadFirebaseConfigFromFile();
      if (firebaseConfig) {
        await this.firebaseManager.init(firebaseConfig);
        this.currentGuests = await this.firebaseManager.getGuests();
        this.isOnlineMode = true;
        this.showSuccess('Conectado a Firebase - Modo en línea');
      } else {
        // Modo offline con localStorage
        this.currentGuests = this.dataManager.getGuests();
        this.showSuccess('Modo sin conexión - Datos locales');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      this.currentGuests = this.dataManager.getGuests();
      this.showError('Error de conexión - Usando modo offline');
    }
  }

  async loadFirebaseConfigFromFile() {
    try {
      const response = await fetch('./config/firebase-config.json');
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.log('No Firebase config found, using offline mode');
    }
    return null;
  }

  async registerGuest() {
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Registrando...';

    try {
      const guestData = this.getFormData();
      
      if (this.isOnlineMode) {
        await this.firebaseManager.addGuest(guestData);
        this.currentGuests = await this.firebaseManager.getGuests();
      } else {
        this.dataManager.addGuest(guestData);
        this.currentGuests = this.dataManager.getGuests();
      }

      this.clearForm();
      this.updateUI();
      this.showSuccess('¡Registro exitoso!');
    } catch (error) {
      console.error('Error registering guest:', error);
      this.showError('Error al registrar. Intenta nuevamente.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Registrar Entrada';
    }
  }

  getFormData() {
    const now = new Date();
    return {
      id: Date.now().toString(),
      name: document.getElementById('name').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      companions: parseInt(document.getElementById('guests').value) || 0,
      timestamp: now.toISOString(),
      entryTime: now.toLocaleString('es-ES')
    };
  }

  clearForm() {
    document.getElementById('registration-form').reset();
  }

  updateUI() {
    this.updateStats();
    this.updateGuestList();
  }

  updateStats() {
    const totalGuests = this.currentGuests.length;
    const totalCompanions = this.currentGuests.reduce((sum, guest) => sum + (guest.companions || 0), 0);
    
    document.getElementById('total-guests').textContent = totalGuests;
    document.getElementById('total-companions').textContent = totalCompanions;
  }

  updateGuestList() {
    const container = document.getElementById('guest-list-container');
    
    if (this.currentGuests.length === 0) {
      container.innerHTML = '<div class="no-guests">No hay registros aún</div>';
      return;
    }

    container.innerHTML = '';
    
    const sortedGuests = [...this.currentGuests]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);

    sortedGuests.forEach((guest) => {
      const guestItem = document.createElement('div');
      guestItem.className = 'guest-item';
      
      guestItem.innerHTML = `
        <div class="guest-info">
          <p class="guest-name">${guest.name}</p>
          <p class="guest-time">${guest.entryTime} • ${guest.companions || 0} acompañantes</p>
        </div>
        <button class="delete-btn" onclick="app.deleteGuest('${guest.id}')">Eliminar</button>
      `;
      
      container.appendChild(guestItem);
    });
  }

  async deleteGuest(guestId) {
    try {
      if (this.isOnlineMode) {
        await this.firebaseManager.deleteGuest(guestId);
        this.currentGuests = await this.firebaseManager.getGuests();
      } else {
        this.dataManager.deleteGuest(guestId);
        this.currentGuests = this.dataManager.getGuests();
      }
      
      this.updateUI();
      this.showSuccess('Registro eliminado');
    } catch (error) {
      console.error('Error deleting guest:', error);
      this.showError('Error al eliminar registro');
    }
  }

  showSuccess(message) {
    const successMsg = document.getElementById('success-message');
    successMsg.textContent = '✓ ' + message;
    successMsg.classList.add('show');
    setTimeout(() => successMsg.classList.remove('show'), 3000);
  }

  showError(message) {
    const errorMsg = document.getElementById('error-message');
    errorMsg.textContent = '✗ ' + message;
    errorMsg.classList.add('show');
    setTimeout(() => errorMsg.classList.remove('show'), 3000);
  }

  showConfig() {
    document.getElementById('config-section').classList.add('show');
  }

  hideConfig() {
    document.getElementById('config-section').classList.remove('show');
  }
}

// Funciones globales
window.loadFirebaseConfig = async function() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const text = await file.text();
      const config = JSON.parse(text);
      localStorage.setItem('firebaseConfig', JSON.stringify(config));
      localStorage.setItem('appConfigured', 'true');
      location.reload();
    }
  };
  input.click();
};

window.initOfflineMode = function() {
  localStorage.setItem('appConfigured', 'true');
  app.hideConfig();
  app.showSuccess('Configurado en modo offline');
};

window.exportToCSV = function() {
  if (app.currentGuests.length === 0) {
    app.showError('No hay datos para exportar');
    return;
  }

  const headers = ['Nombre', 'Teléfono', 'Acompañantes', 'Fecha y Hora'];
  const csvContent = [
    headers.join(','),
    ...app.currentGuests.map(guest => [
      `"${guest.name}"`,
      `"${guest.phone || ''}"`,
      guest.companions || 0,
      `"${guest.entryTime}"`
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `registro_fiesta_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  app.showSuccess('Archivo CSV descargado');
};

window.clearAllData = async function() {
  if (app.currentGuests.length === 0) {
    app.showError('No hay datos para eliminar');
    return;
  }

  if (confirm('¿Estás seguro de eliminar TODOS los registros?')) {
    try {
      if (app.isOnlineMode) {
        await app.firebaseManager.clearAllGuests();
        app.currentGuests = [];
      } else {
        app.dataManager.clearAllGuests();
        app.currentGuests = [];
      }
      
      app.updateUI();
      app.showSuccess('Todos los registros eliminados');
    } catch (error) {
      app.showError('Error al eliminar registros');
    }
  }
};

window.showConfig = function() {
  app.showConfig();
};

// Inicializar la aplicación
const app = new PartyRegistrationApp();
window.app = app;
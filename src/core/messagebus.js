/**
 * Bus de Mensajes
 * 
 * Este módulo proporciona un sistema de mensajería entre los diferentes agentes.
 */

import { EventEmitter } from 'events';

class MessageBus extends EventEmitter {
  constructor() {
    super();
    this.channels = new Map();
    this.subscribers = new Map();
  }

  /**
   * Crea un nuevo canal de comunicación
   * @param {string} channelName - Nombre del canal
   * @returns {boolean} - Éxito de la operación
   */
  createChannel(channelName) {
    if (this.channels.has(channelName)) {
      return false; // El canal ya existe
    }
    
    this.channels.set(channelName, []);
    this.emit('channel:created', { channelName });
    return true;
  }

  /**
   * Suscribe un agente a un canal
   * @param {string} channelName - Nombre del canal
   * @param {string} subscriberId - ID del suscriptor
   * @param {Function} callback - Función a llamar cuando se recibe un mensaje
   * @returns {boolean} - Éxito de la operación
   */
  subscribe(channelName, subscriberId, callback) {
    if (!this.channels.has(channelName)) {
      this.createChannel(channelName);
    }
    
    if (!this.subscribers.has(subscriberId)) {
      this.subscribers.set(subscriberId, new Map());
    }
    
    const subscriberChannels = this.subscribers.get(subscriberId);
    subscriberChannels.set(channelName, callback);
    
    this.emit('subscriber:added', { channelName, subscriberId });
    return true;
  }

  /**
   * Cancela la suscripción de un agente a un canal
   * @param {string} channelName - Nombre del canal
   * @param {string} subscriberId - ID del suscriptor
   * @returns {boolean} - Éxito de la operación
   */
  unsubscribe(channelName, subscriberId) {
    if (!this.subscribers.has(subscriberId)) {
      return false;
    }
    
    const subscriberChannels = this.subscribers.get(subscriberId);
    if (!subscriberChannels.has(channelName)) {
      return false;
    }
    
    subscriberChannels.delete(channelName);
    this.emit('subscriber:removed', { channelName, subscriberId });
    return true;
  }

  /**
   * Publica un mensaje en un canal
   * @param {string} channelName - Nombre del canal
   * @param {object} message - Mensaje a publicar
   * @param {string} senderId - ID del remitente
   * @returns {boolean} - Éxito de la operación
   */
  publish(channelName, message, senderId) {
    if (!this.channels.has(channelName)) {
      return false;
    }
    
    const timestamp = new Date().toISOString();
    const messageWithMetadata = {
      ...message,
      _metadata: {
        timestamp,
        sender: senderId,
        channel: channelName
      }
    };
    
    // Almacenar mensaje en el canal
    const channelMessages = this.channels.get(channelName);
    channelMessages.push(messageWithMetadata);
    this.channels.set(channelName, channelMessages);
    
    // Notificar a los suscriptores
    this.subscribers.forEach((channels, subscriberId) => {
      if (channels.has(channelName) && subscriberId !== senderId) {
        const callback = channels.get(channelName);
        if (typeof callback === 'function') {
          callback(messageWithMetadata);
        }
      }
    });
    
    this.emit('message:published', { channelName, senderId, timestamp });
    return true;
  }

  /**
   * Obtiene los mensajes de un canal
   * @param {string} channelName - Nombre del canal
   * @param {number} limit - Número máximo de mensajes a obtener
   * @returns {Array} - Mensajes del canal
   */
  getMessages(channelName, limit = 100) {
    if (!this.channels.has(channelName)) {
      return [];
    }
    
    const channelMessages = this.channels.get(channelName);
    return channelMessages.slice(-limit);
  }

  /**
   * Elimina un canal
   * @param {string} channelName - Nombre del canal
   * @returns {boolean} - Éxito de la operación
   */
  removeChannel(channelName) {
    if (!this.channels.has(channelName)) {
      return false;
    }
    
    this.channels.delete(channelName);
    
    // Eliminar suscripciones al canal
    this.subscribers.forEach((channels, subscriberId) => {
      if (channels.has(channelName)) {
        channels.delete(channelName);
      }
    });
    
    this.emit('channel:removed', { channelName });
    return true;
  }

  /**
   * Obtiene todos los canales
   * @returns {Array} - Lista de nombres de canales
   */
  getChannels() {
    return Array.from(this.channels.keys());
  }

  /**
   * Obtiene los suscriptores de un canal
   * @param {string} channelName - Nombre del canal
   * @returns {Array} - Lista de IDs de suscriptores
   */
  getSubscribers(channelName) {
    const channelSubscribers = [];
    
    this.subscribers.forEach((channels, subscriberId) => {
      if (channels.has(channelName)) {
        channelSubscribers.push(subscriberId);
      }
    });
    
    return channelSubscribers;
  }
}

export default MessageBus;

import { Injectable, inject, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { StatisticsService } from './statistics.service';
import { UserHttpService } from './https/user-http.service';
import { PlatformStatistics } from '../interfaces/PlatformStatisticsDTO';
import { environment } from '../../environments/environment';

// Types for STOMP-like interface (we'll use native WebSocket with simple protocol)
interface WebSocketMessage {
  type: string;
  destination?: string;
  body?: PlatformStatistics | string;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService implements OnDestroy {
  private statisticsService = inject(StatisticsService);
  private userService = inject(UserHttpService);
  
  private ws: WebSocket | null = null;
  private connected$ = new BehaviorSubject<boolean>(false);
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;

  constructor() {
    this.initializeWebSocketConnection();
  }

  private initializeWebSocketConnection(): void {
    const wsUrl = environment.apiUrl.replace('http', 'ws') + 'ws';
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('Connected to WebSocket');
        this.connected$.next(true);
        this.reconnectAttempts = 0;
        this.subscribeToStatistics();
        this.notifyUserConnection();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('Disconnected from WebSocket');
        this.connected$.next(false);
        this.notifyUserDisconnection();
        this.handleReconnection();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('Failed to initialize WebSocket connection:', error);
      this.handleReconnection();
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'STATISTICS_UPDATE':
        if (message.body) {
          const stats: PlatformStatistics = message.body as PlatformStatistics;
          this.statisticsService.updatePlatformStatistics(stats);
        }
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private handleReconnection(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.initializeWebSocketConnection();
      }, this.reconnectDelay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  private subscribeToStatistics(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // S'abonner aux mises à jour de statistiques
      const subscribeMessage: WebSocketMessage = {
        type: 'SUBSCRIBE',
        destination: '/topic/statistics'
      };
      this.sendMessage(subscribeMessage);

      // Demander les statistiques actuelles
      const connectMessage: WebSocketMessage = {
        type: 'CONNECT_STATISTICS',
        destination: '/app/statistics/connect'
      };
      this.sendMessage(connectMessage);
    }
  }

  private notifyUserConnection(): void {
    const user = this.userService.currentJdrUser();
    if (user?.id && this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type: 'USER_CONNECT',
        destination: '/app/user/connect',
        body: user.id.toString()
      };
      this.sendMessage(message);
    }
  }

  private notifyUserDisconnection(): void {
    const user = this.userService.currentJdrUser();
    if (user?.id && this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type: 'USER_DISCONNECT',
        destination: '/app/user/disconnect',
        body: user.id.toString()
      };
      this.sendMessage(message);
    }
  }

  private sendMessage(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message);
    }
  }

  // Public methods
  connect(): void {
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
      this.reconnectAttempts = 0;
      this.initializeWebSocketConnection();
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.notifyUserDisconnection();
      this.ws.close();
      this.ws = null;
    }
    this.connected$.next(false);
  }

  get isConnected$(): Observable<boolean> {
    return this.connected$.asObservable();
  }

  get isConnected(): boolean {
    return this.connected$.value;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
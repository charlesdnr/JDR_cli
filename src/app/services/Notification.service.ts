import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Client, StompSubscription } from '@stomp/stompjs';
import { UserHttpService } from './https/user-http.service';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { MessageService } from 'primeng/api';
import { environment } from '../../environments/environment';
import SockJS from 'sockjs-client';
import { firstValueFrom } from 'rxjs';
import { Notification } from '../interfaces/Notification';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);
  private userService = inject(UserHttpService);
  private auth = inject(Auth);
  private messageService = inject(MessageService);

  private apiUrl = environment.apiUrl + 'api/notifications';
  private stompClient: Client | null = null;
  private firebaseToken = signal<string | null>(null);

  // Utilisation des signaux Angular 19
  notifications = signal<Notification[]>([]);
  unreadCount = signal<number>(0);
  isConnected = signal<boolean>(false);
  connectionError = signal<string | null>(null);
  connectionPending = signal<boolean>(false);

  // Signal calculé pour récupérer uniquement les notifications non lues
  unreadNotifications = computed(() =>
    this.notifications().filter(notification => !notification.read)
  );

  constructor() {
    onAuthStateChanged(this.auth, async (user) => {
      if (user) {
        try {
          const token = await user.getIdToken();
          this.firebaseToken.set(token);

          // Only try to connect if we have a user but aren't connected yet
          const currentUser = this.userService.currentJdrUser();
          if (currentUser && !this.isConnected() && !this.connectionPending()) {
            this.connect();
            this.loadNotifications();
            this.loadUnreadCount();
          }
        } catch (error) {
          console.error('Error getting Firebase token:', error);
          this.firebaseToken.set(null);
        }
      } else {
        this.firebaseToken.set(null);
        this.disconnect();
        this.notifications.set([]);
        this.unreadCount.set(0);
      }
    });
  }

  async connect(): Promise<void> {
    if (this.isConnected() || this.connectionPending()) return;

    const token = this.firebaseToken();
    if (!token || !this.auth.currentUser) {
      this.connectionError.set('No authentication token available');
      return;
    }

    try {
      this.connectionPending.set(true);

      this.stompClient = new Client({
        webSocketFactory: () => new SockJS(`${environment.apiUrl}ws`),
        connectHeaders: {
          Authorization: `Bearer ${token}`
        },
        debug: (msg: string) => {
          console.log('STOMP Debug:', msg);
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000
      });

      this.stompClient.onConnect = () => {
        const currentUser = this.userService.currentJdrUser();
        if (!currentUser) return;

        this.isConnected.set(true);
        this.connectionPending.set(false);
        this.connectionError.set(null);

        // Subscribe to notification channel
        this.stompClient!.subscribe(`/user/${currentUser.id}/queue/notifications`, (message) => {
          try {
            const notification = JSON.parse(message.body) as Notification;
            this.notifications.update(notifications => [notification, ...notifications]);
            this.unreadCount.update(count => count + 1);

            this.messageService.add({
              severity: 'info',
              summary: 'Nouvelle notification',
              detail: notification.content,
              life: 5000
            });
          } catch (error) {
            console.error('Error parsing notification message:', error);
          }
        });
      };

      this.stompClient.onStompError = (frame) => {
        console.error('WebSocket STOMP error:', frame);
        this.connectionError.set(`Erreur de connexion: ${frame.headers['message']}`);
        this.isConnected.set(false);
        this.connectionPending.set(false);
      };

      this.stompClient.onWebSocketError = (event) => {
        console.error('WebSocket error:', event);
        this.connectionError.set('Erreur de connexion WebSocket');
        this.isConnected.set(false);
        this.connectionPending.set(false);
      };

      this.stompClient.activate();
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      this.connectionError.set(`Erreur d'authentification: ${error}`);
      this.isConnected.set(false);
      this.connectionPending.set(false);
    }
  }

  disconnect(): void {
    if (this.stompClient) {
      this.stompClient.deactivate();
      this.stompClient = null;
    }
    this.isConnected.set(false);
  }

  async loadNotifications(): Promise<void> {
    const currentUser = this.userService.currentJdrUser();
    if (!currentUser) return;

    try {
      const response = await firstValueFrom(this.http.get<Notification[]>(`${this.apiUrl}/user/${currentUser.id}`));
      this.notifications.set(response || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
      this.notifications.set([]);
    }
  }

  async loadUnreadCount(): Promise<void> {
    const currentUser = this.userService.currentJdrUser();
    if (!currentUser) return;

    try {
      const response = await firstValueFrom(this.http.get<{ count: number }>(`${this.apiUrl}/user/${currentUser.id}/count`));
      this.unreadCount.set(response?.count || 0);
    } catch (error) {
      console.error('Error loading unread count:', error);
      this.unreadCount.set(0);
    }
  }

  async markAsRead(notificationId: number): Promise<void> {
    try {
      await firstValueFrom(this.http.post<Notification>(`${this.apiUrl}/${notificationId}/read`, {}));

      // Mettre à jour la notification dans le tableau
      this.notifications.update(notifications =>
        notifications.map(notification =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );

      // Mettre à jour le compteur
      this.loadUnreadCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async markAllAsRead(): Promise<void> {
    const currentUser = this.userService.currentJdrUser();
    if (!currentUser) return;

    try {
      await this.http.post<void>(`${this.apiUrl}/user/${currentUser.id}/read-all`, {}).toPromise();

      // Marquer toutes les notifications comme lues
      this.notifications.update(notifications =>
        notifications.map(notification => ({ ...notification, read: true }))
      );

      // Réinitialiser le compteur
      this.unreadCount.set(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  subscribeToModuleAccessUpdates(moduleId: number, callback: (data: any) => void) {
    if (!this.stompClient || !this.isConnected()) {
      console.error("WebSocket non connecté. Impossible de s'abonner aux mises à jour d'accès.");
      return;
    }
  
    const subscription = this.stompClient.subscribe(
      `/module/${moduleId}/access-updates`,
      (message) => {
        try {
          const data = JSON.parse(message.body);
          console.log(data)
          callback(data);
        } catch (error) {
          console.error("Erreur lors du traitement des données de mise à jour d'accès:", error);
        }
      }
    );
  
    return subscription;
  }
}
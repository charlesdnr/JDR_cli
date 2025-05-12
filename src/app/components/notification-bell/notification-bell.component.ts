import { Component, inject, OnInit } from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { NotificationService } from '../../services/Notification.service';
import { Router } from '@angular/router';
import { Notification } from '../../interfaces/Notification';
import { PopoverModule } from 'primeng/popover';
import { CommonModule } from '@angular/common';
import { OverlayBadgeModule } from 'primeng/overlaybadge';

@Component({
  selector: 'app-notification-bell',
  imports: [
    PopoverModule,
    CommonModule,
    BadgeModule,
    ButtonModule,
    OverlayBadgeModule,
    AvatarModule],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.scss'
})
export class NotificationBellComponent implements OnInit {
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  // Accéder directement aux signaux
  notifications = this.notificationService.notifications;
  unreadCount = this.notificationService.unreadCount;

  ngOnInit(): void {
    // Charger les données initiales
    this.notificationService.loadNotifications();
    this.notificationService.loadUnreadCount();
  }

  getIconForType(type: string): string {
    switch (type.toUpperCase()) {
      case 'MODULE_SHARED': return 'pi-share-alt';
      case 'MODULE_COMMENT': return 'pi-comment';
      case 'MODULE_LIKE': return 'pi-heart';
      case 'REVIEW_ADDED': return 'pi-star';
      case 'MENTION': return 'pi-user';
      default: return 'pi-bell';
    }
  }

  async markAllAsRead(): Promise<void> {
    await this.notificationService.markAllAsRead();
  }

  async onNotificationClick(notification: Notification): Promise<void> {
    // Marquer comme lu
    if (!notification.read) {
      await this.notificationService.markAsRead(notification.id);
    }

    // Naviguer vers le module si disponible
    if (notification.moduleId) {
      this.router.navigate(['/modules', notification.moduleId]);
    }
  }
}

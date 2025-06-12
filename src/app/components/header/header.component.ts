import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthHttpService } from '../../services/https/auth-http.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import { UserHttpService } from '../../services/https/user-http.service';
import { FolderService } from '../../services/folders.service';
import { NotificationBellComponent } from '../notification-bell/notification-bell.component';

export interface buttonHeader {
  name: string;
  icon: string;
  link: string;
}

@Component({
  selector: 'app-header',
  imports: [
    CommonModule,
    ButtonModule,
    InputTextModule,
    InputGroupModule,
    InputGroupAddonModule,
    RouterLink,
    TranslateModule,
    TooltipModule,
    NotificationBellComponent
  ],
  providers: [FolderService],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  private httpAuth = inject(AuthHttpService);
  private userService = inject(UserHttpService);
  private router = inject(Router);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private folderSerice = inject(FolderService);

  isMobileMenuOpen = signal(false);
  folders = this.folderSerice.currentFolders.asReadonly();

  mapButton = computed(() => {
    return [
      { name: 'Explorer', icon: 'explore', link: '/explore' },
      { name: 'Projets', icon: 'assignment', link: '/projects' },
    ]
  })

  currentUser = computed(() => this.userService.currentJdrUser());

  toggleMobileMenu() {
    this.isMobileMenuOpen.update(value => !value);
  }

  logout(event: Event) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: 'Voulez vous vous déconnecter ?',
      header: 'Attention !',
      icon: 'pi pi-info-circle',
      rejectLabel: 'Cancel',
      rejectButtonProps: {
        label: 'Cancel',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: {
        label: 'Se déconnecter',
        severity: 'danger',
      },

      accept: async () => {
        try {
          await this.httpAuth.logout();
          this.userService.currentJdrUser.set(null);
          this.router.navigateByUrl('/home')
        } catch (err) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Erreur',
            detail: 'Erreur lors de la déconnexion : ' + err,
          });
        }
      },
    });
  }
}

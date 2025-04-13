import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Auth, User, authState } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { AuthHttpService } from '../../services/https/auth-http.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';

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
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  private auth = inject(Auth);
  private httpAuth = inject(AuthHttpService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  user$: Observable<User | null>;

  mapButton: buttonHeader[] = [
    { name: 'Nouveau Projet', icon: 'assignment_add', link: '/new-project' },
    { name: 'Projets', icon: 'assignment', link: '/projects' },
    { name: 'Compte', icon: 'account_circle', link: '/account' },
  ];

  constructor() {
    this.user$ = authState(this.auth);
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

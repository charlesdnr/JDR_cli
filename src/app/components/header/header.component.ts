import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

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
    TranslateModule
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  mapButton: buttonHeader[] = [
    { name: 'Nouveau Projet', icon: 'assignment_add', link: '/new-project' },
    { name: 'Projets', icon: 'assignment', link: '/projects' },
    { name: 'Compte', icon: 'account_circle', link: '/account' },
  ];

  public get token(): string | null {
    return localStorage.getItem('token');
  }
}

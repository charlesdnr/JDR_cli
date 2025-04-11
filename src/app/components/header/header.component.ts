// src/app/components/header/header.component.ts - Version corrigée
import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core'; // Ajoutez OnInit si vous n'utilisez pas async pipe
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Auth, User, authState } from '@angular/fire/auth'; // Importez authState
import { Observable } from 'rxjs'; // Importez Observable
import { AuthHttpService } from '../../services/https/auth-http.service';

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
  private auth = inject(Auth);
  private httpAuth = inject(AuthHttpService)

  user$: Observable<User | null>;

  mapButton: buttonHeader[] = [
    { name: 'Nouveau Projet', icon: 'assignment_add', link: '/new-project' },
    { name: 'Projets', icon: 'assignment', link: '/projects' },
    { name: 'Compte', icon: 'account_circle', link: '/account' },
  ];

  constructor() {
    this.user$ = authState(this.auth);
  }

  logout(){
    // this.httpAuth.<
  }
}
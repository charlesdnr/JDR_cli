import { Component, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { TooltipModule } from 'primeng/tooltip';
import { ModuleSummary } from '../../classes/ModuleSummary';
import { Module } from '../../classes/Module';

@Component({
  selector: 'app-module-card',
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    ChipModule,
    TooltipModule
  ],
  templateUrl: './module-card.component.html',
  styleUrl: './module-card.component.scss'
})
export class ModuleCardComponent {
  module = input.required<ModuleSummary | Module>();
  showCreator = input<boolean>(true);
  clickable = input<boolean>(true);
  isHorizontal = input<boolean>(false);
  
  private router = inject(Router);

  openModule() {
    if (this.clickable()) {
      this.router.navigate(['/module', this.module().id]);
    }
  }

  goToUserProfile(event: Event, userId?: number) {
    event.stopPropagation(); // Empêcher la propagation vers le click du module
    if (userId) {
      this.router.navigate(['/user', userId]);
    }
  }

  getImageSrc(): string {
    return this.module().picture?.src || 'assets/images/baseImageModule.png';
  }

  getCreatedAt(): string {
    const module = this.module();
    
    // Si c'est un Module complet, utiliser sa propriété createdAt
    if ('createdAt' in module && module.createdAt) {
      return module.createdAt;
    }
    
    // Sinon, si on a des versions, prendre la date de la première version
    if (module.versions && module.versions.length > 0) {
      return module.versions[0].createdAt || '';
    }
    
    return '';
  }

  isPublished(): boolean {
    return this.module().versions?.some(v => v.published) || false;
  }

  getTimeAgo(dateString: string): string {
    if (!dateString) return '';
    
    const now = new Date();
    const moduleDate = new Date(dateString);
    const diffInDays = Math.floor((now.getTime() - moduleDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Aujourd\'hui';
    if (diffInDays === 1) return 'Hier';
    if (diffInDays < 7) return `Il y a ${diffInDays} jours`;
    if (diffInDays < 30) return `Il y a ${Math.floor(diffInDays / 7)} semaines`;
    return `Il y a ${Math.floor(diffInDays / 30)} mois`;
  }
}
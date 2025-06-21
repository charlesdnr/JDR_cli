import { Component, input, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { TooltipModule } from 'primeng/tooltip';
import { BadgeModule } from 'primeng/badge';
import { DialogService, DynamicDialogRef, DynamicDialogModule } from 'primeng/dynamicdialog';
import { ModuleSummary } from '../../classes/ModuleSummary';
import { Module } from '../../classes/Module';
import { ModuleCommentService } from '../../services/https/module-comment.service';
import { ModuleCommentsComponent } from '../module-comments/module-comments.component';
import { ModuleRatingsHttpService } from '../../services/https/module-ratings-http.service';
import { ModuleRatingsComponent } from '../module-ratings/module-ratings.component';
import { AggregatedRatings } from '../../classes/AggregatedRatings';

@Component({
  selector: 'app-module-card',
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    ChipModule,
    TooltipModule,
    BadgeModule,
    DynamicDialogModule
  ],
  providers: [DialogService],
  templateUrl: './module-card.component.html',
  styleUrl: './module-card.component.scss'
})
export class ModuleCardComponent implements OnInit {
  module = input.required<ModuleSummary | Module>();
  showCreator = input<boolean>(true);
  clickable = input<boolean>(true);
  isHorizontal = input<boolean>(false);
  showComments = input<boolean>(true);
  showRatings = input<boolean>(true);
  
  private router = inject(Router);
  private moduleCommentService = inject(ModuleCommentService);
  private moduleRatingsHttpService = inject(ModuleRatingsHttpService);
  private dialogService = inject(DialogService);
  
  commentCount = signal<number>(0);
  averageRating = signal<number>(0);
  ratingCount = signal<number>(0);
  private dialogRef: DynamicDialogRef | undefined;

  ngOnInit() {
    if (this.showComments()) {
      this.loadCommentCount();
    }
    if (this.showRatings()) {
      this.loadRatingData();
    }
  }

  private async loadCommentCount() {
    try {
      const comments = await this.moduleCommentService.getModuleCommentsByModule(this.module().id, 0, 1000);
      this.commentCount.set(comments.length);
    } catch {
      console.error('Error loading comment count');
    }
  }

  private async loadRatingData() {
    try {
      const ratingsData: AggregatedRatings = await this.moduleRatingsHttpService.getModuleRatingsByModule(this.module().id);
      this.averageRating.set(ratingsData.moduleAverageRating);
      this.ratingCount.set(ratingsData.moduleNumberOfRatings);
    } catch {
      console.error('Error loading rating data');
    }
  }

  openModule() {
    if (this.clickable()) {
      this.router.navigate(['/module', this.module().id]);
    }
  }

  goToUserProfile(event: Event, userId?: number) {
    event.stopPropagation(); // Empêcher la propagation vers le click du module
    if (userId && userId > 0 && Number.isInteger(userId)) {
      this.router.navigate(['/user', userId]).catch(error => {
        console.error('Navigation error:', error);
      });
    }
  }

  openComments(event: Event) {
    event.stopPropagation(); // Empêcher la propagation vers le click du module
    
    this.dialogRef = this.dialogService.open(ModuleCommentsComponent, {
      header: `Commentaires - ${this.module().title}`,
      width: '90vw',
      height: '80vh',
      modal: true,
      closable: true,
      data: {
        moduleId: this.module().id,
        moduleVersionId: undefined // Pour les commentaires généraux du module
      }
    });

    this.dialogRef.onClose.subscribe(() => {
      // Recharger le nombre de commentaires au cas où il y en aurait de nouveaux
      this.loadCommentCount();
    });
  }

  openRatings(event: Event) {
    event.stopPropagation(); // Empêcher la propagation vers le click du module
    
    this.dialogRef = this.dialogService.open(ModuleRatingsComponent, {
      header: `Évaluations - ${this.module().title}`,
      width: '90vw',
      height: '80vh',
      modal: true,
      closable: true,
      data: {
        moduleId: this.module().id,
        moduleVersionId: undefined // Pour les ratings généraux du module
      }
    });

    this.dialogRef.onClose.subscribe(() => {
      // Recharger les données de rating au cas où il y en aurait de nouvelles
      this.loadRatingData();
    });
  }

  getRatingTooltip(): string {
    const rating = this.averageRating();
    const count = this.ratingCount();
    
    if (rating === 0 || count === 0) {
      return 'Aucune évaluation';
    }
    
    const ratingText = this.getRatingText(rating);
    return `${ratingText} (${rating.toFixed(1)}/5) - ${count} évaluation${count > 1 ? 's' : ''}`;
  }

  private getRatingText(rating: number): string {
    if (rating >= 4.5) return 'Excellent';
    if (rating >= 3.5) return 'Très bon';
    if (rating >= 2.5) return 'Correct';
    if (rating >= 1.5) return 'Passable';
    return 'Décevant';
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
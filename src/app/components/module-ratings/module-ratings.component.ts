import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { AvatarModule } from 'primeng/avatar';
import { Textarea } from 'primeng/inputtextarea';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { Select } from 'primeng/select';
import { RatingModule } from 'primeng/rating';
import { TagModule } from 'primeng/tag';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DynamicDialogConfig } from 'primeng/dynamicdialog';
import { ModuleRating } from '../../classes/ModuleRating';
import { AggregatedRatings } from '../../classes/AggregatedRatings';
import { ModuleRatingsHttpService } from '../../services/https/module-ratings-http.service';
import { ModuleHttpService } from '../../services/https/module-http.service';
import { UserHttpService } from '../../services/https/user-http.service';
import { UserAvatarService } from '../../services/user-avatar.service';
import { User } from '../../classes/User';
import { Module } from '../../classes/Module';

@Component({
  selector: 'app-module-ratings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    AvatarModule,
    Textarea,
    ConfirmDialogModule,
    ToastModule,
    TooltipModule,
    Select,
    RatingModule,
    TagModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './module-ratings.component.html',
  styleUrl: './module-ratings.component.scss'
})
export class ModuleRatingsComponent implements OnInit {
  @Input() moduleId!: number;
  @Input() moduleVersionId?: number;

  private moduleRatingsService = inject(ModuleRatingsHttpService);
  private moduleService = inject(ModuleHttpService);
  private userService = inject(UserHttpService);
  private userAvatarService = inject(UserAvatarService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private dialogConfig = inject(DynamicDialogConfig, { optional: true });
  private router = inject(Router);

  aggregatedRatings = signal<AggregatedRatings | null>(null);
  allRatings = signal<Record<string, ModuleRating[]>>({});
  currentVersionRatings = signal<ModuleRating[]>([]);
  newRating = signal<number>(0);
  newComment = signal('');
  editingRating = signal<ModuleRating | null>(null);
  editRatingValue = signal<number>(0);
  editText = signal('');
  loading = signal(false);
  currentUser = signal<User | null>(null);
  
  // Sélection de version
  module = signal<Module | null>(null);
  availableVersions = signal<{label: string, value: number | null}[]>([]);
  selectedVersionId = signal<number | null>(null);
  
  // Cache des images de profil des utilisateurs
  userProfileImages = signal<Map<number, string>>(new Map());

  ngOnInit() {
    // Récupérer les données soit depuis les @Input soit depuis la modal
    if (this.dialogConfig?.data) {
      this.moduleId = this.dialogConfig.data.moduleId;
      this.moduleVersionId = this.dialogConfig.data.moduleVersionId;
    }
    
    this.selectedVersionId.set(this.moduleVersionId || null);
    this.loadModule();
    this.loadCurrentUser();
    this.loadAllRatings();
  }

  private async loadModule() {
    if (!this.moduleId) return;
    
    try {
      const module = await this.moduleService.getModuleById(this.moduleId);
      this.module.set(module);
      this.setupVersionDropdown(module);
      this.loadRatings();
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Impossible de charger le module'
      });
    }
  }

  private setupVersionDropdown(module: Module) {
    const versions: {label: string, value: number | null}[] = [];
    
    // Ajouter les versions publiées, triées par numéro décroissant
    if (module.versions && module.versions.length > 0) {
      const publishedVersions = module.versions
        .filter(v => v.published)
        .sort((a, b) => (b.version || 0) - (a.version || 0));
      
      publishedVersions.forEach(version => {
        if (version.id) {
          versions.push({
            label: `Version ${version.version} ${version.createdAt ? '(' + new Date(version.createdAt).toLocaleDateString('fr-FR') + ')' : ''}`,
            value: version.id
          });
        }
      });
    }
    
    this.availableVersions.set(versions);
    
    // Sélectionner automatiquement la première version si aucune n'est déjà sélectionnée
    if (versions.length > 0 && !this.selectedVersionId()) {
      this.selectedVersionId.set(versions[0].value);
    }
  }

  private async loadCurrentUser() {
    try {
      const user = this.userService.currentJdrUser();
      this.currentUser.set(user);
    } catch {
      console.error('Error loading current user');
    }
  }

  async loadAllRatings() {
    if (!this.moduleId) return;
    
    this.loading.set(true);
    try {
      const allRatingsData = await this.moduleRatingsService.getAllModuleRatingsGroupedByVersion(this.moduleId);
      this.allRatings.set(allRatingsData);
      this.updateCurrentVersionRatings();
    } catch (error) {
      console.error('Erreur lors du chargement des ratings:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Impossible de charger les évaluations'
      });
    } finally {
      this.loading.set(false);
    }
  }

  async loadRatings() {
    const versionId = this.selectedVersionId();
    if (!versionId) return;
    
    this.loading.set(true);
    try {
      const ratingsData = await this.moduleRatingsService.getModuleRatingsByModuleVersion(versionId);
      this.aggregatedRatings.set(ratingsData);
      this.updateCurrentVersionRatings();
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Impossible de charger les évaluations'
      });
    } finally {
      this.loading.set(false);
    }
  }

  private updateCurrentVersionRatings() {
    const versionId = this.selectedVersionId();
    if (!versionId) {
      this.currentVersionRatings.set([]);
      return;
    }
    
    const ratingsObj = this.allRatings();
    const versionRatings = ratingsObj[versionId.toString()] || [];
    this.currentVersionRatings.set(versionRatings);
    
    // Charger les images de profil des utilisateurs
    this.loadUserProfileImages();
  }

  onVersionChange(versionId: number | null) {
    this.selectedVersionId.set(versionId);
    this.loadRatings();
    this.updateCurrentVersionRatings();
  }

  async submitRating() {
    const versionId = this.selectedVersionId();
    if (!this.newRating() || !this.currentUser() || !versionId) return;

    this.loading.set(true);
    try {
      const rating = new ModuleRating();
      rating.id = null; // ID null pour une nouvelle création
      rating.moduleId = this.moduleId;
      rating.moduleVersionId = versionId;
      rating.rating = this.newRating();
      rating.user = this.currentUser();

      await this.moduleRatingsService.createModuleRating(rating);
      
      this.newRating.set(0);
      this.newComment.set('');
      await this.loadRatings();
      await this.loadAllRatings();
      
      this.messageService.add({
        severity: 'success',
        summary: 'Succès',
        detail: 'Évaluation ajoutée avec succès'
      });
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Impossible d\'ajouter l\'évaluation'
      });
    } finally {
      this.loading.set(false);
    }
  }

  startEdit(rating: ModuleRating) {
    this.editingRating.set(rating);
    this.editRatingValue.set(rating.rating);
    this.editText.set(''); // Les ratings n'ont pas de commentaire pour l'instant
  }

  cancelEdit() {
    this.editingRating.set(null);
    this.editRatingValue.set(0);
    this.editText.set('');
  }

  async saveEdit() {
    const rating = this.editingRating();
    if (!rating || !this.editRatingValue()) return;

    this.loading.set(true);
    try {
      rating.rating = this.editRatingValue();

      await this.moduleRatingsService.updateModuleRating(rating);
      
      this.editingRating.set(null);
      this.editRatingValue.set(0);
      this.editText.set('');
      await this.loadRatings();
      await this.loadAllRatings();
      
      this.messageService.add({
        severity: 'success',
        summary: 'Succès',
        detail: 'Évaluation modifiée avec succès'
      });
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Impossible de modifier l\'évaluation'
      });
    } finally {
      this.loading.set(false);
    }
  }

  confirmDelete(rating: ModuleRating) {
    this.confirmationService.confirm({
      message: 'Êtes-vous sûr de vouloir supprimer cette évaluation ?',
      header: 'Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.deleteRating(rating)
    });
  }

  private async deleteRating(rating: ModuleRating) {
    this.loading.set(true);
    try {
      await this.moduleRatingsService.deleteModuleRating(rating.id ?? 0);
      await this.loadRatings();
      await this.loadAllRatings();
      
      this.messageService.add({
        severity: 'success',
        summary: 'Succès',
        detail: 'Évaluation supprimée avec succès'
      });
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Impossible de supprimer l\'évaluation'
      });
    } finally {
      this.loading.set(false);
    }
  }

  canEditRating(rating: ModuleRating): boolean {
    const user = this.currentUser();
    return user !== null && rating.user?.id === user.id;
  }

  getRatingText(rating: number): string {
    if (rating >= 4.5) return 'Excellent';
    if (rating >= 3.5) return 'Très bon';
    if (rating >= 2.5) return 'Correct';
    if (rating >= 1.5) return 'Passable';
    return 'Décevant';
  }

  getRatingColor(rating: number): string {
    if (rating >= 4.5) return '#10b981'; // vert
    if (rating >= 3.5) return '#f59e0b'; // jaune
    if (rating >= 2.5) return '#f97316'; // orange
    return '#ef4444'; // rouge
  }

  getTimeAgo(date: Date): string {
    const now = new Date();
    const diffInMs = now.getTime() - new Date(date).getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'À l\'instant';
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`;
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    if (diffInDays < 7) return `Il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
    
    return new Date(date).toLocaleDateString('fr-FR');
  }

  getUserInitials(user: User | null): string {
    if (!user || !user.username) return '?';
    return user.username
      .split(' ')
      .map((name: string) => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  /**
   * Récupère l'image de profil d'un utilisateur de manière asynchrone
   */
  async getUserProfileImage(user: User | null): Promise<string | null> {
    if (!user?.id) return null;
    
    const currentImages = this.userProfileImages();
    
    // Si on a déjà l'image en cache, la retourner
    if (currentImages.has(user.id)) {
      return currentImages.get(user.id) || null;
    }
    
    try {
      const imageUrl = await this.userAvatarService.getUserProfileImage(user);
      
      // Vérifier si c'est l'image par défaut ou une URL invalide
      if (!imageUrl || imageUrl === 'assets/images/default-avatar.png' || imageUrl.includes('default-avatar')) {
        return null; // Retourner null pour utiliser les initiales
      }
      
      // Mettre à jour le cache
      const updatedImages = new Map(currentImages);
      updatedImages.set(user.id, imageUrl);
      this.userProfileImages.set(updatedImages);
      
      return imageUrl;
    } catch (error) {
      console.error('Erreur lors du chargement de l\'image de profil:', error);
      return null;
    }
  }

  /**
   * Récupère l'image de profil mise en cache pour un utilisateur
   */
  getCachedUserProfileImage(user: User | null): string | null {
    if (!user?.id) return null;
    const currentImages = this.userProfileImages();
    return currentImages.get(user.id) || null;
  }

  /**
   * Charge les images de profil pour tous les utilisateurs qui ont évalué
   */
  private async loadUserProfileImages() {
    const ratings = this.currentVersionRatings();
    const uniqueUsers = new Map<number, User>();
    
    // Collecter tous les utilisateurs uniques
    ratings.forEach(rating => {
      if (rating.user?.id) {
        uniqueUsers.set(rating.user.id, rating.user);
      }
    });
    
    // Charger les images pour chaque utilisateur
    for (const user of uniqueUsers.values()) {
      await this.getUserProfileImage(user);
    }
  }

  /**
   * Gère les erreurs de chargement d'image de profil
   */
  onProfileImageError(_event: Event, user: User | null) {
    if (!user?.id) return;
    
    // Supprimer l'image du cache pour qu'elle ne soit plus utilisée
    const currentImages = this.userProfileImages();
    const updatedImages = new Map(currentImages);
    updatedImages.delete(user.id);
    this.userProfileImages.set(updatedImages);
  }


  goToUserProfile(event: Event, user: User | null) {
    event.stopPropagation();
    if (user?.id) {
      this.router.navigate(['/user', user.id]);
    }
  }

  // Propriétés computed pour l'affichage
  get userRating(): ModuleRating | null {
    const currentUser = this.currentUser();
    if (!currentUser) return null;
    
    const versionRatings = this.currentVersionRatings();
    return versionRatings.find(rating => rating.user?.id === currentUser.id) || null;
  }

  get hasUserRated(): boolean {
    return this.userRating !== null;
  }

  get averageRating(): number {
    return this.aggregatedRatings()?.versionAverageRating || 0;
  }

  get totalRatings(): number {
    return this.aggregatedRatings()?.versionNumberOfRatings || 0;
  }

  get otherUsersRatings(): ModuleRating[] {
    const currentUser = this.currentUser();
    if (!currentUser) return this.currentVersionRatings();
    
    return this.currentVersionRatings().filter(rating => rating.user?.id !== currentUser.id);
  }
}
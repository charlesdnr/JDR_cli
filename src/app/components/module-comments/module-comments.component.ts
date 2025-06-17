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
import { ConfirmationService, MessageService } from 'primeng/api';
import { DynamicDialogConfig } from 'primeng/dynamicdialog';
import { ModuleComment } from '../../classes/ModuleComment';
import { ModuleCommentService } from '../../services/https/module-comment.service';
import { ModuleHttpService } from '../../services/https/module-http.service';
import { UserHttpService } from '../../services/https/user-http.service';
import { UserAvatarService } from '../../services/user-avatar.service';
import { User } from '../../classes/User';
import { Module } from '../../classes/Module';

@Component({
  selector: 'app-module-comments',
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
    Select
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './module-comments.component.html',
  styleUrl: './module-comments.component.scss'
})
export class ModuleCommentsComponent implements OnInit {
  @Input() moduleId!: number;
  @Input() moduleVersionId?: number;

  private moduleCommentService = inject(ModuleCommentService);
  private moduleService = inject(ModuleHttpService);
  private userService = inject(UserHttpService);
  private userAvatarService = inject(UserAvatarService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private dialogConfig = inject(DynamicDialogConfig, { optional: true });
  private router = inject(Router);

  comments = signal<ModuleComment[]>([]);
  newComment = signal('');
  editingComment = signal<ModuleComment | null>(null);
  editText = signal('');
  loading = signal(false);
  currentUser = signal<User | null>(null);
  
  // Nouvelle fonctionnalité : sélection de version
  module = signal<Module | null>(null);
  availableVersions = signal<{label: string, value: number | null}[]>([]);
  selectedVersionId = signal<number | null>(null);

  ngOnInit() {
    // Récupérer les données soit depuis les @Input soit depuis la modal
    if (this.dialogConfig?.data) {
      this.moduleId = this.dialogConfig.data.moduleId;
      this.moduleVersionId = this.dialogConfig.data.moduleVersionId;
    }
    
    this.selectedVersionId.set(this.moduleVersionId || null);
    this.loadModule();
    this.loadCurrentUser();
  }

  private async loadModule() {
    if (!this.moduleId) return;
    
    try {
      const module = await this.moduleService.getModuleById(this.moduleId);
      this.module.set(module);
      this.setupVersionDropdown(module);
      this.loadComments();
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

  async loadComments() {
    const versionId = this.selectedVersionId();
    if (!versionId) return; // Ne charger les commentaires que s'il y a une version sélectionnée
    
    this.loading.set(true);
    try {
      const comments = await this.moduleCommentService.getModuleCommentsByModuleVersion(versionId);
      
      this.comments.set(comments.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Impossible de charger les commentaires'
      });
    } finally {
      this.loading.set(false);
    }
  }

  onVersionChange(versionId: number | null) {
    this.selectedVersionId.set(versionId);
    this.loadComments();
  }

  onTextareaKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      if (!this.newComment().trim() || !this.currentUser() || this.loading()) {
        return;
      }
      this.submitComment();
    }
  }

  onEditTextareaKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      if (!this.editText().trim() || this.loading()) {
        return;
      }
      this.saveEdit();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelEdit();
    }
  }

  async submitComment() {
    const versionId = this.selectedVersionId();
    if (!this.newComment().trim() || !this.currentUser() || !versionId) return;

    this.loading.set(true);
    try {
      const comment = new ModuleComment();
      comment.moduleId = this.moduleId;
      comment.moduleVersionId = versionId;
      comment.comment = this.newComment().trim();
      comment.user = this.currentUser();

      await this.moduleCommentService.createModuleComment(comment);
      this.newComment.set('');
      await this.loadComments();
      
      this.messageService.add({
        severity: 'success',
        summary: 'Succès',
        detail: 'Commentaire ajouté avec succès'
      });
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Impossible d\'ajouter le commentaire'
      });
    } finally {
      this.loading.set(false);
    }
  }

  startEdit(comment: ModuleComment) {
    this.editingComment.set(comment);
    this.editText.set(comment.comment);
  }

  cancelEdit() {
    this.editingComment.set(null);
    this.editText.set('');
  }

  async saveEdit() {
    const comment = this.editingComment();
    if (!comment || !this.editText().trim()) return;

    this.loading.set(true);
    try {
      comment.comment = this.editText().trim();
      await this.moduleCommentService.updateModuleComment(comment);
      
      this.editingComment.set(null);
      this.editText.set('');
      await this.loadComments();
      
      this.messageService.add({
        severity: 'success',
        summary: 'Succès',
        detail: 'Commentaire modifié avec succès'
      });
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Impossible de modifier le commentaire'
      });
    } finally {
      this.loading.set(false);
    }
  }

  confirmDelete(comment: ModuleComment) {
    this.confirmationService.confirm({
      message: 'Êtes-vous sûr de vouloir supprimer ce commentaire ?',
      header: 'Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.deleteComment(comment)
    });
  }

  private async deleteComment(comment: ModuleComment) {
    this.loading.set(true);
    try {
      await this.moduleCommentService.deleteModuleComment(comment.id);
      await this.loadComments();
      
      this.messageService.add({
        severity: 'success',
        summary: 'Succès',
        detail: 'Commentaire supprimé avec succès'
      });
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Impossible de supprimer le commentaire'
      });
    } finally {
      this.loading.set(false);
    }
  }

  canEditComment(comment: ModuleComment): boolean {
    const user = this.currentUser();
    return user !== null && comment.user?.id === user.id;
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

  trackByCommentId(_: number, comment: ModuleComment): number {
    return comment.id;
  }

  getVersionLabel(versionId: number): string {
    const module = this.module();
    if (!module || !module.versions) return 'Version inconnue';
    
    const version = module.versions.find(v => v.id === versionId);
    return version 
      ? `v${version.version}`
      : 'Version inconnue';
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

  goToUserProfile(event: Event, user: User | null) {
    event.stopPropagation();
    if (user?.id) {
      this.router.navigate(['/user', user.id]);
    }
  }
}
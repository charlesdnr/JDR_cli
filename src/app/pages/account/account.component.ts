import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { UserHttpService } from '../../services/https/user-http.service';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { MessageService } from 'primeng/api';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Auth, deleteUser, sendPasswordResetEmail } from '@angular/fire/auth';
import { Dialog } from 'primeng/dialog';
import { PasswordModule } from 'primeng/password';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { TooltipModule } from 'primeng/tooltip';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { FileUploadModule, FileSelectEvent } from 'primeng/fileupload';
import { FileHttpService } from '../../services/https/file-http.service';
import { Subscription } from 'rxjs';
import { FirebaseError } from '@angular/fire/app';
import { UserProfileService } from '../../services/user-profile.service';

@Component({
  selector: 'app-account',
  imports: [
    CommonModule,
    TranslateModule,
    ReactiveFormsModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    Dialog,
    AvatarModule,
    PasswordModule,
    InputGroupModule,
    InputGroupAddonModule,
    TooltipModule,
    ToggleButtonModule,
    FileUploadModule,
  ],
  templateUrl: './account.component.html',
  styleUrl: './account.component.scss',
})
export class AccountComponent implements OnInit, OnDestroy {
  private userService = inject(UserHttpService);
  private messageService = inject(MessageService);
  private router = inject(Router);
  private auth = inject(Auth);
  private fileHttpService = inject(FileHttpService);
  private userProfileService = inject(UserProfileService);

  private subscriptions = new Subscription();

  formgroupPassword = new FormGroup({
    password: new FormControl('', [Validators.required]),
    confirm: new FormControl('', [Validators.required]),
  });

  // Changement principal : utiliser un signal pour l'username éditable
  originalUsername = signal('');
  editableUsername = signal('');

  // Computed pour détecter les changements
  hasChanges = computed(() => {
    const current = this.editableUsername();
    const original = this.originalUsername();
    return current !== original;
  });

  showPasswordResetDialog = signal(false);
  resetPasswordEmail = signal('');
  sendingEmail = signal(false);

  currentUser = computed(() => this.userService.currentJdrUser());

  // Profile page specific properties
  profileImagePreview = signal<string | null>(null);
  uploadingProfileImage = signal(false);
  
  // Computed properties from service
  currentUserProfile = computed(() => this.userProfileService.currentUserProfile());
  profileImageUrl = computed(() => this.userProfileService.currentUserProfileImageUrl());
  memberSince = computed(() => {
    return '2024';
  });

  // Real user statistics from backend
  userStats = signal({
    modulesCreated: 0,
    totalPlays: 0,
    totalDownloads: 0,
    followers: 0,
    averageRating: 0,
  });

  loadingUserStats = signal(false);

  userPreferencesData = {
    emailNotifications: true,
    publicProfile: true,
    darkMode: false,
  };

  userPreferences = signal(this.userPreferencesData);

  recentActivities = signal([
    {
      id: 1,
      type: 'module_created',
      description: 'Nouveau module "Les Cryptes Oubliées" créé',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
    {
      id: 2,
      type: 'module_played',
      description: 'Partie jouée sur "L\'Aventure Mystique"',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    },
    {
      id: 3,
      type: 'achievement',
      description: 'Réalisation débloquée: "Maître Créateur"',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    },
    {
      id: 4,
      type: 'rating',
      description: 'Note de 5 étoiles reçue sur "Donjon Sombre"',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
  ]);

  userAchievements = signal([
    {
      id: 1,
      title: 'Premier Module',
      description: 'Créer votre premier module',
      icon: 'pi pi-file-plus',
      unlocked: true,
    },
    {
      id: 2,
      title: 'Créateur Populaire',
      description: '100+ téléchargements sur un module',
      icon: 'pi pi-star',
      unlocked: true,
    },
    {
      id: 3,
      title: 'Maître du Jeu',
      description: 'Animer 50 parties',
      icon: 'pi pi-crown',
      unlocked: true,
    },
    {
      id: 4,
      title: 'Légende',
      description: 'Atteindre 1000 téléchargements',
      icon: 'pi pi-trophy',
      unlocked: false,
    },
  ]);


  ngOnInit() {
    const user = this.currentUser();
    if (user?.username) {
      this.originalUsername.set(user.username);
      this.editableUsername.set(user.username); // Initialiser les deux
    }
    
    // Initialiser l'aperçu de l'image avec l'image du profil actuel
    const profileImage = this.profileImageUrl();
    if (profileImage) {
      this.profileImagePreview.set(profileImage);
    }
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }


  saveUser() {
    const user = this.currentUser();
    if (!user?.id) return;

    // Mettre à jour l'username de l'utilisateur avec la valeur éditée
    const updatedUser = { ...user, username: this.editableUsername() };

    this.userService
      .put(updatedUser, user.id)
      .then(() => {
        // Mettre à jour l'username original après sauvegarde réussie
        this.originalUsername.set(this.editableUsername());

        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Modifications sauvegardées avec succès',
        });

        // Mettre à jour le signal utilisateur
        this.userService.updateCurrentUserSignal(updatedUser);
        this.userService.saveUserToSession(updatedUser);
      })
      .catch((err: HttpErrorResponse) =>
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: `Erreur : ${err.message}`,
        })
      );
  }

  // Méthode pour annuler les modifications
  cancelChanges() {
    this.editableUsername.set(this.originalUsername());
  }

  changePassword() {
    const user = this.currentUser();
    if (user?.email) {
      this.resetPasswordEmail.set(user.email);
      this.showPasswordResetDialog.set(true);
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Avertissement',
        detail: 'Aucune adresse email associée à votre compte',
      });
    }
  }

  async sendPasswordResetEmail() {
    this.sendingEmail.set(true);
    try {
      await sendPasswordResetEmail(this.auth, this.resetPasswordEmail());
      this.messageService.add({
        severity: 'success',
        summary: 'Succès',
        detail: 'Email de réinitialisation envoyé avec succès',
      });
      this.showPasswordResetDialog.set(false);
    } catch (error: unknown) {
      let errorMessage = 'Une erreur est survenue';

      switch ((error as FirebaseError).code) {
        case 'auth/user-not-found':
          errorMessage = 'Aucun utilisateur trouvé avec cette adresse email';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Adresse email invalide';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Trop de tentatives. Réessayez plus tard';
          break;
        default:
          errorMessage = (error as FirebaseError).message;
      }

      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: errorMessage,
      });
    } finally {
      this.sendingEmail.set(false);
    }
  }

  onProfileImageSelect(event: FileSelectEvent) {
    const file = event.files[0];

    if (!file) return;

    // Validation du fichier
    if (!file.type.startsWith('image/')) {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Veuillez sélectionner un fichier image valide',
      });
      return;
    }

    // Limite de taille : 5MB
    if (file.size > 5000000) {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'La taille du fichier ne doit pas dépasser 5MB',
      });
      return;
    }

    this.uploadingProfileImage.set(true);

    // Créer un aperçu local
    const reader = new FileReader();
    reader.onload = (e) => {
      this.profileImagePreview.set(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload vers le serveur
    this.fileHttpService
      .uploadFile(file)
      .then(async (fileId: string) => {
        try {
          await this.userProfileService.updateProfileImage(fileId);
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Photo de profil mise à jour avec succès',
          });
        } catch (error) {
          console.error("Erreur lors de la mise à jour du profil:", error);
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Erreur lors de la mise à jour du profil utilisateur',
          });
          this.profileImagePreview.set(null);
        }
      })
      .catch((error) => {
        console.error("Erreur lors de l'upload:", error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Erreur lors de la mise à jour de la photo de profil',
        });
        this.profileImagePreview.set(null);
      })
      .finally(() => {
        this.uploadingProfileImage.set(false);
      });
  }

  async deletePhoto() {
    try {
      await this.userProfileService.removeProfileImage();
      this.profileImagePreview.set(null);
      this.messageService.add({
        severity: 'success',
        summary: 'Succès',
        detail: 'Photo de profil supprimée avec succès',
      });
    } catch (error) {
      console.error("Erreur lors de la suppression de la photo:", error);
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Erreur lors de la suppression de la photo de profil',
      });
    }
  }

  getCurrentProfileImage(): string {
    // Priorité : aperçu local > URL serveur > image par défaut
    return (
      this.profileImagePreview() ||
      this.userProfileService.currentUserProfileImage()
    );
  }

  getActivityIcon(type: string): string {
    switch (type) {
      case 'module_created':
        return 'pi pi-file-plus';
      case 'module_played':
        return 'pi pi-play';
      case 'achievement':
        return 'pi pi-trophy';
      case 'rating':
        return 'pi pi-star';
      default:
        return 'pi pi-circle';
    }
  }

  updatePreference(key: keyof typeof this.userPreferencesData, value: boolean) {
    const currentPrefs = this.userPreferences();
    this.userPreferences.set({
      ...currentPrefs,
      [key]: value,
    });
  }

  async deleteAccount() {
    const currentUser = this.auth.currentUser;
    if (currentUser) {
      try {
        const user = this.currentUser();
        if (!user?.id) return;
        await this.userService.delete(user.id);
        await deleteUser(currentUser);
        this.userService.currentJdrUser.set(null);
        this.router.navigateByUrl('/home');
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Compte supprimé avec succès',
        });
      } catch (error: unknown) {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: `Erreur : ${error}`,
        });
      }
    }
  }
}

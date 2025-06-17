import { Injectable, signal, WritableSignal, effect, computed, inject } from '@angular/core';
import { UserProfile } from '../classes/UserProfile';
import { UserProfileHttpService } from './https/user-profile-http.service';
import { UserHttpService } from './https/user-http.service';
import { Picture } from '../classes/Picture';

const USER_PROFILE_STORAGE_KEY = 'currentUserProfile';

@Injectable({
  providedIn: 'root',
})
export class UserProfileService {
  private userProfileHttpService = inject(UserProfileHttpService);
  private userHttpService = inject(UserHttpService);

  // Signal pour le UserProfile de l'utilisateur connecté
  readonly currentUserProfile: WritableSignal<UserProfile | null> = signal(this.loadUserProfileFromSession());

  // Computed pour récupérer l'URL de la photo de profil
  readonly currentUserProfileImageUrl = computed(() => {
    const profile = this.currentUserProfile();
    return profile?.picture?.src || null;
  });

  // Computed pour récupérer l'image de profil avec fallback
  readonly currentUserProfileImage = computed(() => {
    const imageUrl = this.currentUserProfileImageUrl();
    return imageUrl || 'assets/images/default-avatar.png';
  });

  // Computed pour vérifier si un profile est chargé
  readonly hasUserProfile = computed(() => {
    return this.currentUserProfile() !== null;
  });

  constructor() {
    // Effet pour sauvegarder le profile en session quand il change
    effect(() => {
      const currentProfile = this.currentUserProfile();
      if (currentProfile) {
        this.saveUserProfileToSession(currentProfile);
      } else {
        this.clearUserProfileStorage();
      }
    });

    // Effet pour charger le profile quand l'utilisateur change
    effect(() => {
      const currentUser = this.userHttpService.currentJdrUser();
      if (currentUser?.id && !this.currentUserProfile()) {
        this.loadUserProfile(currentUser.id);
      } else if (!currentUser) {
        this.clearCurrentUserProfile();
      }
    });
  }

  // --- Méthodes publiques ---

  /**
   * Charge le profil utilisateur depuis le serveur
   */
  async loadUserProfile(userId: number): Promise<void> {
    try {
      const profile = await this.userProfileHttpService.getUserProfileByUserId(userId);
      this.currentUserProfile.set(profile);
    } catch (error) {
      console.error('Erreur lors du chargement du profil utilisateur:', error);
      this.currentUserProfile.set(null);
    }
  }

  /**
   * Met à jour le profil utilisateur
   */
  async updateUserProfile(profile: UserProfile): Promise<void> {
    try {
      const updatedProfile = await this.userProfileHttpService.updateUserProfile(profile);
      this.currentUserProfile.set(updatedProfile);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil utilisateur:', error);
      throw error;
    }
  }

  /**
   * Met à jour la photo de profil
   */
  async updateProfileImage(pictureId: string): Promise<void> {
    const currentProfile = this.currentUserProfile();
    if (!currentProfile) {
      throw new Error('Aucun profil utilisateur chargé');
    }

    const updatedProfile = { ...currentProfile };
    updatedProfile.picture = new Picture("Photo de profil", pictureId);
    
    await this.updateUserProfile(updatedProfile);
  }

  /**
   * Supprime la photo de profil
   */
  async removeProfileImage(): Promise<void> {
    const currentProfile = this.currentUserProfile();
    if (!currentProfile) {
      throw new Error('Aucun profil utilisateur chargé');
    }

    const updatedProfile = { ...currentProfile };
    updatedProfile.picture = null;
    
    await this.updateUserProfile(updatedProfile);
  }

  /**
   * Force le rechargement du profil utilisateur
   */
  async refreshUserProfile(): Promise<void> {
    const currentUser = this.userHttpService.currentJdrUser();
    if (currentUser?.id) {
      await this.loadUserProfile(currentUser.id);
    }
  }

  /**
   * Efface le profil utilisateur actuel
   */
  clearCurrentUserProfile(): void {
    this.currentUserProfile.set(null);
  }

  /**
   * Met à jour le signal du profil utilisateur
   */
  updateCurrentUserProfileSignal(profile: UserProfile | null): void {
    this.currentUserProfile.set(profile);
  }

  // --- Méthodes privées ---

  private loadUserProfileFromSession(): UserProfile | null {
    if (typeof sessionStorage === 'undefined') return null;
    const profileJson = sessionStorage.getItem(USER_PROFILE_STORAGE_KEY);
    if (profileJson) {
      try {
        return JSON.parse(profileJson) as UserProfile;
      } catch (e) {
        console.error("Erreur parsing profil utilisateur session", e);
        sessionStorage.removeItem(USER_PROFILE_STORAGE_KEY);
        return null;
      }
    }
    return null;
  }

  private saveUserProfileToSession(profile: UserProfile): void {
    if (typeof sessionStorage === 'undefined') return;
    try {
      sessionStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.error("Erreur sauvegarde profil utilisateur session", e);
    }
  }

  private clearUserProfileStorage(): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(USER_PROFILE_STORAGE_KEY);
    }
  }
}
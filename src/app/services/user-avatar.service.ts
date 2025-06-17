import { Injectable, inject } from '@angular/core';
import { UserProfileHttpService } from './https/user-profile-http.service';
import { User } from '../classes/User';
import { UserProfile } from '../classes/UserProfile';

@Injectable({
  providedIn: 'root',
})
export class UserAvatarService {
  private userProfileHttpService = inject(UserProfileHttpService);
  
  // Cache pour éviter de récupérer plusieurs fois le même profil
  private profileCache = new Map<number, Promise<UserProfile>>();

  /**
   * Récupère l'URL de la photo de profil d'un utilisateur
   * @param user L'utilisateur dont on veut la photo
   * @returns L'URL de la photo ou l'image par défaut
   */
  async getUserProfileImage(user: User): Promise<string> {
    try {
      const profile = await this.getUserProfile(user.id);
      return profile?.picture?.src || 'assets/images/default-avatar.png';
    } catch (error) {
      console.error('Erreur lors de la récupération de la photo de profil:', error);
      return 'assets/images/default-avatar.png';
    }
  }

  /**
   * Récupère les initiales d'un utilisateur
   * @param user L'utilisateur dont on veut les initiales
   * @returns Les initiales (première lettre du nom d'utilisateur)
   */
  getUserInitials(user: User): string {
    if (!user?.username) return 'U';
    return user.username.charAt(0).toUpperCase();
  }

  /**
   * Méthode synchrone pour récupérer l'image de profil avec fallback
   * Utilise les initiales si l'image n'est pas disponible
   * @param _user L'utilisateur (non utilisé pour l'instant)
   * @returns L'URL de l'image ou null pour utiliser les initiales
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getUserProfileImageSync(_user: User): string | null {
    // Pour l'instant, on retourne null pour utiliser les initiales
    // Dans une implémentation plus avancée, on pourrait avoir un cache synchrone
    return null;
  }

  /**
   * Efface le cache d'un utilisateur
   * @param userId L'ID de l'utilisateur
   */
  clearUserProfileCache(userId: number): void {
    this.profileCache.delete(userId);
  }

  /**
   * Efface tout le cache
   */
  clearAllCache(): void {
    this.profileCache.clear();
  }

  private async getUserProfile(userId: number): Promise<UserProfile> {
    // Vérifier si le profil est déjà en cours de récupération
    if (this.profileCache.has(userId)) {
      return this.profileCache.get(userId)!;
    }

    // Créer la promesse et la mettre en cache
    const profilePromise = this.userProfileHttpService.getUserProfileByUserId(userId);
    this.profileCache.set(userId, profilePromise);

    try {
      const profile = await profilePromise;
      return profile;
    } catch (error) {
      // Supprimer du cache en cas d'erreur pour permettre un nouvel essai
      this.profileCache.delete(userId);
      throw error;
    }
  }
}
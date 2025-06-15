import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { BaseHttpService } from './base-http.service';
import { UserSubscription } from '../../classes/UserSubscription';

@Injectable({
  providedIn: 'root'
})
export class UserProfileHttpService extends BaseHttpService {

  constructor() {
    super('api/user-profile/user');
  }

  subscribeToUserProfile(userId: number): Promise<UserSubscription> {
    // Chemin spécifique pour s'abonner aux mises à jour du profil utilisateur
    const url = `${this.baseApiUrl}/${userId}/subscribe`;
    return firstValueFrom(this.httpClient.get<UserSubscription>(url));
  }

  unsubscribeFromUserProfile(userId: number): Promise<UserSubscription> {
    // Chemin spécifique pour se désabonner des mises à jour du profil utilisateur
    const url = `${this.baseApiUrl}/${userId}/unsubscribe`;
    return firstValueFrom(this.httpClient.get<UserSubscription>(url));
  }

  getUserSubscription(userId: number): Promise<UserSubscription> {
    // Chemin spécifique pour obtenir l'abonnement d'un utilisateur
    const url = `${this.baseApiUrl}/${userId}/subscription`;
    return firstValueFrom(this.httpClient.get<UserSubscription>(url));
  }

  getUserSubscribers(userId: number): Promise<UserSubscription[]> {
    // Chemin spécifique pour obtenir les abonnés d'un utilisateur
    const url = `${this.baseApiUrl}/${userId}/subscribers`;
    return firstValueFrom(this.httpClient.get<UserSubscription[]>(url));
  }

  getuserViews(userId: number): Promise<number> {
    // Chemin spécifique pour obtenir le nombre de vues du profil utilisateur
    const url = `${this.baseApiUrl}/${userId}/views`;
    return firstValueFrom(this.httpClient.get<number>(url));
  }

  decrementUserViews(userId: number): Promise<void> {
    // Chemin spécifique pour décrémenter le nombre de vues du profil utilisateur
    const url = `${this.baseApiUrl}/${userId}/views/decrement`;
    return firstValueFrom(this.httpClient.post<void>(url, {}));
  }

  incrementUserViews(userId: number): Promise<void> {
    // Chemin spécifique pour incrémenter le nombre de vues du profil utilisateur
    const url = `${this.baseApiUrl}/${userId}/views/increment`;
    return firstValueFrom(this.httpClient.post<void>(url, {}));
  }
} 
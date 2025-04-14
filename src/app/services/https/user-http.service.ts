// src/app/services/https/user-http.service.ts
import { Injectable, signal, WritableSignal, effect } from '@angular/core'; // Importer signal, WritableSignal, effect
import { BaseHttpService } from './base-http.service';
import { User } from '../../classes/User';
import { firstValueFrom } from 'rxjs';

const USER_STORAGE_KEY = 'currentJdrUser'; // Clé pour le sessionStorage

@Injectable({
  providedIn: 'root',
})
export class UserHttpService extends BaseHttpService {
  readonly currentJdrUser: WritableSignal<User | null> = signal(this.loadUserFromSession());

  constructor() {
    super('api/user');
    effect(() => {
      const currentUser = this.currentJdrUser();
      if (currentUser) {
        this.saveUserToSession(currentUser);
      } else {
        this.clearUserStorage();
      }
    });
  }

  updateCurrentUser(user: User | null): void {
    this.currentJdrUser.set(user);
  }

  getUserByEmail(email: string): Promise<User> {
    return firstValueFrom(
      this.httpClient.get<User>(this.apiUrl + '/email/' + email)
    );
  }

  private loadUserFromSession(): User | null {
    if (typeof sessionStorage === 'undefined') {
      console.warn("SessionStorage n'est pas disponible.");
      return null;
    }

    const userJson = sessionStorage.getItem(USER_STORAGE_KEY);
    if (userJson) {
      try {
        return JSON.parse(userJson) as User;
      } catch (e) {
        console.error("Erreur lors du parsing de l'utilisateur depuis la session", e);
        sessionStorage.removeItem(USER_STORAGE_KEY);
        return null;
      }
    }
    return null;
  }

  private saveUserToSession(user: User): void {
    if (typeof sessionStorage === 'undefined') return;
    try {
      sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
      console.error("Erreur lors de la sauvegarde de l'utilisateur en session", e);
    }
  }

  private clearUserStorage(): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(USER_STORAGE_KEY);
    }
  }

  clearCurrentUser(): void {
    this.currentJdrUser.set(null);
  }
}
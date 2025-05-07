// src/app/services/https/user-http.service.ts
import { Injectable, signal, WritableSignal, effect } from '@angular/core';
import { BaseHttpService } from './base-http.service';
import { User } from '../../classes/User';
import { firstValueFrom } from 'rxjs';

const USER_STORAGE_KEY = 'currentJdrUser';

@Injectable({
  providedIn: 'root',
})
export class UserHttpService extends BaseHttpService {
  readonly currentJdrUser: WritableSignal<User | null> = signal(this.loadUserFromSession());

  constructor() {
    super('api/user'); // Chemin de base pour les utilisateurs
    effect(() => {
      const currentUser = this.currentJdrUser();
      if (currentUser) {
        this.saveUserToSession(currentUser);
      } else {
        this.clearUserStorage();
      }
    });
  }

  // --- Méthodes CRUD Standard ---

  /** POST /api/user */
  createUser(user: Partial<User>): Promise<User> {
    // T=User, B=Partial<User> (ou un DTO spécifique si défini)
    return this.post<User, Partial<User>>(user);
  }

  /** GET /api/user */
  getAllUsers(): Promise<User[]> {
    return this.get<User[]>();
  }

  /** GET /api/user/{id} */
  getUserById(id: number): Promise<User> {
    return this.get<User>(id);
  }

  /** PUT /api/user/{id} */
  updateUser(id: number, user: User): Promise<User> {
    // T=User, B=User
    return this.put<User, User>(user, id);
  }

  /** DELETE /api/user/{id} */
  deleteUser(id: number): Promise<void> {
    // Backend renvoie 204 No Content
    return this.delete<void>(id);
  }

  // --- Méthodes Spécifiques ---

  /** GET /api/user/email/{email} */
  getUserByEmail(email: string): Promise<User> {
    // Chemin spécifique
    const specificUrl = `${this.baseApiUrl}/email/${email}`;
    return firstValueFrom(this.httpClient.get<User>(specificUrl));
  }

  searchUserByEmail(email: string){
    const specificUrl = `${this.baseApiUrl}/search/email/${email}`;
    return this.httpClient.get<User[]>(specificUrl);
  }
  searchUserByUsername(username: string){
    const specificUrl = `${this.baseApiUrl}/search/username/${username}`;
    return this.httpClient.get<User[]>(specificUrl);
  }


  // --- Gestion Signal et SessionStorage ---

  updateCurrentUserSignal(user: User | null): void {
    this.currentJdrUser.set(user);
  }

  private loadUserFromSession(): User | null {
    if (typeof sessionStorage === 'undefined') return null;
    const userJson = sessionStorage.getItem(USER_STORAGE_KEY);
    if (userJson) {
      try {
        return JSON.parse(userJson) as User;
      } catch (e) {
        console.error("Erreur parsing utilisateur session", e);
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
      console.error("Erreur sauvegarde utilisateur session", e);
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

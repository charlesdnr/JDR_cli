import { computed, inject, Injectable, signal } from '@angular/core';
import { UserFolderHttpService } from './https/user-folder-http.service';
import { UserFolder } from '../classes/UserFolder';
import { MessageService } from 'primeng/api';
import { UserHttpService } from './https/user-http.service';
import { Auth, User, onAuthStateChanged } from '@angular/fire/auth'; // Importez onAuthStateChanged

@Injectable({
  providedIn: 'root'
})
export class FolderService {
  private httpUserFolderService = inject(UserFolderHttpService);
  private messageService = inject(MessageService);
  private userService = inject(UserHttpService);
  private auth = inject(Auth);

  private firebaseUser = signal<User | null>(null);

  private jdrAppUser = computed(() => this.userService.currentJdrUser());

  currentFolders = signal<UserFolder[]>([]);

  constructor() {
    // Écoutez les changements d'état d'authentification de Firebase
    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        // L'utilisateur est connecté
        this.firebaseUser.set(user);
        // Charger les dossiers seulement s'ils ne sont pas déjà chargés
        this.loadFolders();
      } else {
        // L'utilisateur est déconnecté
        this.firebaseUser.set(null);
        this.currentFolders.set([]); // Videz les dossiers si l'utilisateur se déconnecte
      }
    });
  }

  /**
   * Force le rechargement des dossiers
   */
  async forceReloadFolders() {
    const currentFbUser = this.firebaseUser();
    if (!currentFbUser) return [];

    try {
      const idToken = await currentFbUser.getIdToken();
      const user = this.jdrAppUser();
      if (!user) return [];

      const fetchedFolders = await this.httpUserFolderService.getAllUserFolders(user.id);
      this.currentFolders.set(fetchedFolders);
      return fetchedFolders;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('forceReloadFolders - Erreur lors du chargement des dossiers:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur Dossiers',
        detail: `Impossible de charger les dossiers. ${errorMessage}`
      });
      return [];
    }
  }

  /**
   * Charge les dossiers de l'utilisateur (avec cache)
   */
  async loadFolders() {
    // Si les dossiers sont déjà chargés, ne pas refaire l'appel
    if (this.currentFolders().length > 0) {
      return this.currentFolders();
    }

    return this.forceReloadFolders();
  }
}
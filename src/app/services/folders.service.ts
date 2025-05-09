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
        this.loadFolders(); // Chargez les dossiers maintenant que l'utilisateur Firebase est connu
      } else {
        // L'utilisateur est déconnecté
        this.firebaseUser.set(null);
        this.currentFolders.set([]); // Videz les dossiers si l'utilisateur se déconnecte
      }
    });
  }

  /**
   * Charge les dossiers de l'utilisateur
   */
  async loadFolders() {
    const currentFbUser = this.firebaseUser();

    if (!currentFbUser) {
      return [];
    }

    // Maintenant, obtenez le token ID de l'utilisateur Firebase authentifié
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const idToken = await currentFbUser.getIdToken(); // Ceci rafraîchit aussi le token s'il est expiré

      const user = this.jdrAppUser();

      if (!user) {
        return [];
      }

      const fetchedFolders = await this.httpUserFolderService.getAllUserFolders(user.id);
      this.currentFolders.set(fetchedFolders);
      return fetchedFolders;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('loadFolders - Erreur lors du chargement des dossiers:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur Dossiers',
        detail: `Impossible de charger les dossiers. ${errorMessage}`
      });
      return [];
    }
  }
}
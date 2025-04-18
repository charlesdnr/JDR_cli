import { Injectable } from '@angular/core';
import { BaseHttpService } from './base-http.service';
import { UserFolder } from '../../classes/UserFolder'; // Assurez-vous que le chemin est correct

@Injectable({
  providedIn: 'root'
})
export class UserFolderService extends BaseHttpService {

  constructor() {
    super('api/user/folders');
  }

  /**
   * Récupère tous les dossiers de l'utilisateur connecté.
   * GET /api/user/folders (le backend devrait filtrer par utilisateur)
   */
  getAllUserFolders(): Promise<UserFolder[]> {
    return this.get<UserFolder[]>();
  }

  /**
   * Récupère un dossier spécifique par son ID.
   * GET /api/user/folders/{folderId}
   * @param folderId L'ID du dossier.
   */
  getUserFolderById(folderId: number): Promise<UserFolder> {
    return this.get<UserFolder>(folderId);
  }

  /**
   * Crée un nouveau dossier pour l'utilisateur.
   * POST /api/user/folders
   * @param folder Les données du dossier à créer (userId est important).
   */
  createUserFolder(folder: UserFolder): Promise<UserFolder> {
    return this.post<UserFolder>(folder);
  }

  /**
   * Met à jour un dossier existant.
   * PUT /api/user/folders/{folderId}
   * @param folderId L'ID du dossier à mettre à jour.
   * @param folder Les nouvelles données du dossier.
   */
  updateUserFolder(folderId: number, folder: UserFolder): Promise<UserFolder> {
    return this.put<UserFolder>(folder, folderId);
  }

  /**
   * Supprime un dossier.
   * DELETE /api/user/folders/{folderId}
   * @param folderId L'ID du dossier à supprimer.
   */
  deleteUserFolder(folderId: number): Promise<void> {
    // On suppose que le backend renvoie un statut 204 No Content sans corps
    return this.delete<void>(folderId);
  }
}
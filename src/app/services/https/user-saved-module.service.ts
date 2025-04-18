import { Injectable } from '@angular/core';
import { BaseHttpService } from './base-http.service';
import { UserSavedModule } from '../../classes/UserSavedModule'; // Assurez-vous que le chemin est correct

@Injectable({
  providedIn: 'root'
})
export class UserSavedModuleService extends BaseHttpService {

  constructor() {
    super('api/user/saved-modules');
  }

  /**
   * Récupère tous les modules sauvegardés par l'utilisateur connecté.
   * GET /api/user/saved-modules (le backend devrait filtrer par utilisateur)
   */
  getAllUserSavedModules(): Promise<UserSavedModule[]> {
    return this.get<UserSavedModule[]>();
  }

  /**
   * Récupère un enregistrement de module sauvegardé spécifique par son ID.
   * GET /api/user/saved-modules/{savedModuleId}
   * @param savedModuleId L'ID de l'enregistrement sauvegardé.
   */
  getUserSavedModuleById(savedModuleId: number): Promise<UserSavedModule> {
    return this.get<UserSavedModule>(savedModuleId);
  }

  /**
  * Récupère tous les modules sauvegardés dans un dossier spécifique.
  * GET /api/user/saved-modules/folder/{folderId}
  * @param folderId L'ID du dossier.
  */
  getSavedModulesByFolder(folderId: number): Promise<UserSavedModule[]> {
    return this.get<UserSavedModule[]>(undefined, `folder/${folderId}`);
  }

  /**
   * Crée un nouvel enregistrement pour sauvegarder un module.
   * POST /api/user/saved-modules
   * @param savedModule Les données de la sauvegarde (userId, moduleId, moduleVersionId, etc.).
   */
  saveModule(savedModule: UserSavedModule): Promise<UserSavedModule> {
    return this.post<UserSavedModule>(savedModule);
  }

  /**
   * Met à jour un enregistrement de module sauvegardé (ex: changer alias, dossier).
   * PUT /api/user/saved-modules/{savedModuleId}
   * @param savedModuleId L'ID de l'enregistrement à mettre à jour.
   * @param savedModule Les nouvelles données de l'enregistrement.
   */
  updateSavedModule(savedModuleId: number, savedModule: UserSavedModule): Promise<UserSavedModule> {
    return this.put<UserSavedModule>(savedModule, savedModuleId);
  }

  /**
   * Supprime un enregistrement de module sauvegardé (ne supprime pas le module lui-même).
   * DELETE /api/user/saved-modules/{savedModuleId}
   * @param savedModuleId L'ID de l'enregistrement à supprimer.
   */
  unsaveModule(savedModuleId: number): Promise<void> {
    // On suppose que le backend renvoie un statut 204 No Content sans corps
    return this.delete<void>(savedModuleId);
  }
}
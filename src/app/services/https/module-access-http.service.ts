import { Injectable } from '@angular/core';
import { BaseHttpService } from './base-http.service';
import { ModuleAccess } from '../../classes/ModuleAccess'; // Vérifiez l'import
import { AccessRight } from '../../enum/AccessRight'; // Vérifiez l'import

@Injectable({
  providedIn: 'root'
})
export class ModuleAccessHttpService extends BaseHttpService {

  constructor() {
    // Correspond à @RequestMapping("api/module-access")
    super('api/module-access');
  }

  /**
   * Récupère un accès module par son ID.
   * GET /api/module-access/{id}
   * @param id L'ID de l'accès module.
   */
  getModuleAccessById(id: number): Promise<ModuleAccess> {
    return this.get<ModuleAccess>(id);
  }

  /**
   * Récupère tous les accès pour un module donné.
   * GET /api/module-access/module/{moduleId}
   * @param moduleId L'ID du module.
   */
  getModuleAccessByModuleId(moduleId: number): Promise<ModuleAccess[]> {
    // Utilisation de get avec un pathSuffix personnalisé
    return this.get<ModuleAccess[]> (undefined, `module/${moduleId}`);
  }

  /**
   * Récupère l'accès spécifique d'un utilisateur à un module.
   * GET /api/module-access/user/{userId}/module/{moduleId}
   * @param userId L'ID de l'utilisateur.
   * @param moduleId L'ID du module.
   */
  getModuleAccessByUserAndModule(userId: number, moduleId: number): Promise<ModuleAccess> {
     // Utilisation de get avec un pathSuffix personnalisé
    return this.get<ModuleAccess>(undefined, `user/${userId}/module/${moduleId}`);
  }

  /**
   * Crée un nouvel accès pour un utilisateur à un module.
   * POST /api/module-access/module/{moduleId}/user/{userId}
   * @param moduleId L'ID du module.
   * @param userId L'ID de l'utilisateur.
   */
  createModuleAccess(moduleId: number, userId: number): Promise<ModuleAccess> {
     // Le corps est vide car les IDs sont dans l'URL
    return this.post<ModuleAccess>({}, `module/${moduleId}/user/${userId}`);
  }

  /**
   * Supprime un accès module.
   * DELETE /api/module-access/{id}
   * @param id L'ID de l'accès à supprimer.
   */
  deleteModuleAccess(id: number): Promise<ModuleAccess> {
    // Le contrôleur Java renvoie le DTO avant NO_CONTENT
    return this.delete<ModuleAccess>(id);
  }

  /**
   * Active/désactive un droit d'accès spécifique.
   * PATCH /api/module-access/{id}/rights/{accessRight}
   * @param id L'ID de l'accès module.
   * @param accessRight Le droit à activer/désactiver (VIEW, EDIT, PUBLISH, INVITE).
   */
  toggleAccessRight(id: number, accessRight: AccessRight): Promise<ModuleAccess> {
    // Le corps de la requête PATCH est vide car tout est dans l'URL
    return this.patch<ModuleAccess>({}, id, `rights/${accessRight}`);
  }
}
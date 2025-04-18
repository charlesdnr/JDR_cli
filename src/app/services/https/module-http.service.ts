import { Injectable } from '@angular/core';
import { BaseHttpService } from './base-http.service';
import { ModuleResponse } from '../../classes/ModuleResponse'; // Vérifiez l'import
import { ModuleRequest } from '../../classes/ModuleRequest'; // Vérifiez l'import

@Injectable({
  providedIn: 'root'
})
export class ModuleHttpService extends BaseHttpService {

  constructor() {
    // Correspond à @RequestMapping("/api/modules")
    super('api/modules');
  }

  /**
   * Récupère tous les modules.
   * GET /api/modules
   */
  getAllModules(): Promise<ModuleResponse[]> {
    return this.get<ModuleResponse[]>();
  }

  /**
   * Récupère un module par son ID.
   * GET /api/modules/{id}
   * @param id L'ID du module.
   */
  getModuleById(id: number): Promise<ModuleResponse> {
    return this.get<ModuleResponse>(id);
  }

  /**
   * Crée un nouveau module.
   * POST /api/modules
   * @param moduleRequest Les données du module à créer.
   */
  createModule(moduleRequest: ModuleRequest): Promise<ModuleResponse> {
    return this.post<ModuleResponse>(moduleRequest);
  }

  /**
   * Met à jour un module existant.
   * PUT /api/modules/{id}
   * @param id L'ID du module à mettre à jour.
   * @param moduleRequest Les nouvelles données du module.
   */
  updateModule(id: number, moduleRequest: ModuleRequest): Promise<ModuleResponse> {
    return this.put<ModuleResponse>(moduleRequest, id);
  }

  /**
   * Supprime un module.
   * DELETE /api/modules/{id}
   * @param id L'ID du module à supprimer.
   */
  deleteModule(id: number): Promise<void> {
    // Le contrôleur Java renvoie ResponseEntity<Void> avec HttpStatus.NO_CONTENT
    return this.delete<void>(id);
  }
}
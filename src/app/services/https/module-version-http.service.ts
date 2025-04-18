import { Injectable } from '@angular/core';
import { BaseHttpService } from './base-http.service';
import { ModuleVersion } from '../../classes/ModuleVersion'; // Vérifiez l'import
import { firstValueFrom, map } from 'rxjs';
import { createBlock } from '../../utils/createBlock';
import { IBlockData } from '../../interfaces/IBlockData'; // Vérifiez l'import
import { IModuleVersionResponse } from '../../interfaces/IModuleVersionResponse'; // Vérifiez l'import
import { Block } from '../../classes/Block';

@Injectable({
  providedIn: 'root'
})
export class ModuleVersionHttpService extends BaseHttpService {

  constructor() {
    // Correspond à @RequestMapping("/api/versions")
    super('api/versions');
  }

  /**
   * Récupère une version de module par son ID.
   * GET /api/versions/{id}
   * @param versionId L'ID de la version du module.
   */
  getModuleVersionById(versionId: number): Promise<ModuleVersion> {
    return this.get<ModuleVersion>(versionId);
  }

  /**
   * Récupère toutes les versions pour un module spécifique.
   * GET /api/versions/module/{moduleId}
   * @param moduleId L'ID du module parent.
   */
  getModuleVersionsByModuleId(moduleId: number): Promise<ModuleVersion[]> {
    return this.get<ModuleVersion[]>(undefined, `module/${moduleId}`);
  }

  /**
   * Crée une nouvelle version pour un module.
   * POST /api/versions/module/{moduleId}
   * @param moduleId L'ID du module parent.
   * @param moduleVersion Les données de la version à créer.
   */
  createModuleVersion(moduleId: number, moduleVersion: ModuleVersion): Promise<ModuleVersion> {
    return this.post<ModuleVersion>(moduleVersion, `module/${moduleId}`);
  }

  /**
   * Met à jour une version de module existante.
   * PUT /api/versions/{id}
   * @param versionId L'ID de la version à mettre à jour.
   * @param moduleVersion Les nouvelles données de la version.
   */
  updateModuleVersion(versionId: number, moduleVersion: ModuleVersion): Promise<ModuleVersion> {
    return this.put<ModuleVersion>(moduleVersion, versionId);
  }

  /**
   * Supprime une version de module.
   * DELETE /api/versions/{id}
   * @param versionId L'ID de la version à supprimer.
   */
  deleteModuleVersion(versionId: number): Promise<void> {
    // Le contrôleur Java renvoie ResponseEntity<Void> avec HttpStatus.NO_CONTENT
    return this.delete<void>(versionId);
  }

  /**
   * Récupère une version de module avec ses blocs associés (Endpoint spécifique).
   * GET /api/module-versions/{versionId}/with-blocks (supposé, non dans le contrôleur fourni)
   * @param versionId L'ID de la version du module.
   */
  getModuleVersionWithBlocks(versionId: number): Promise<ModuleVersion & { blocks: Block[] }> {
    // Ce chemin est spécifique et différent du chemin de base du service.
    // On utilise donc directement httpClient.get avec l'URL complète.
    const specificUrl = `${this.apiUrl.replace('/versions', '/module-versions')}/${versionId}/with-blocks`;
    return firstValueFrom(this.httpClient.get<IModuleVersionResponse>(specificUrl)
      .pipe(
        map(data => ({
          // Reconstruit un objet ModuleVersion avec les propriétés de base
          // et ajoute la propriété 'blocks' transformée.
          ...new ModuleVersion(
            data.moduleId,
            data.version,
            data.published,
            data.createdBy,
            data.createdAt,
            data.updatedAt,
            data.gameSystemId,
            data.language,
            data.id
          ),
          blocks: data.blocks.map((blockData: IBlockData) => createBlock(blockData))
        }))
      ));
  }
}
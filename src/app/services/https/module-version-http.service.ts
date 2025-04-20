import { Injectable } from '@angular/core';
import { BaseHttpService } from './base-http.service';
import { ModuleVersion } from '../../classes/ModuleVersion';
import { firstValueFrom, map } from 'rxjs';
import { createBlock } from '../../utils/createBlock';
import { IBlockData } from '../../interfaces/IBlockData';
import { IModuleVersionResponse } from '../../interfaces/IModuleVersionResponse';
import { Block } from '../../classes/Block';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ModuleVersionHttpService extends BaseHttpService {

  constructor() {
    super('api/versions');
  }

  /** GET /api/versions/{id} */
  getModuleVersionById(versionId: number): Promise<ModuleVersion> {
    return this.get<ModuleVersion>(versionId);
  }

  /** GET /api/versions/module/{moduleId} */
  getModuleVersionsByModuleId(moduleId: number): Promise<ModuleVersion[]> {
    // Chemin spécifique
    const specificUrl = `${this.baseApiUrl}/module/${moduleId}`;
    return firstValueFrom(this.httpClient.get<ModuleVersion[]>(specificUrl));
  }

  /** POST /api/versions/module/{moduleId} */
  createModuleVersion(moduleId: number, moduleVersion: ModuleVersion): Promise<ModuleVersion> {
    // Chemin spécifique
    const specificUrl = `${this.baseApiUrl}/module/${moduleId}`;
    // T=ModuleVersion, B=ModuleVersion
    return firstValueFrom(this.httpClient.post<ModuleVersion>(specificUrl, moduleVersion));
  }

  /** PUT /api/versions/{id} */
  updateModuleVersion(versionId: number, moduleVersion: ModuleVersion): Promise<ModuleVersion> {
    // Appel standard, T=ModuleVersion, B=ModuleVersion
    return this.put<ModuleVersion, ModuleVersion>(moduleVersion, versionId);
  }

  /** DELETE /api/versions/{id} */
  deleteModuleVersion(versionId: number): Promise<void> {
    // Appel standard, le backend renvoie 204 No Content
    return this.delete<void>(versionId);
  }

  /** GET /api/module-versions/{versionId}/with-blocks (Chemin spécifique) */
  getModuleVersionWithBlocks(versionId: number): Promise<ModuleVersion & { blocks: Block[] }> {
    // Chemin spécifique, différent de baseApiUrl
    const specificUrl = `${environment.apiUrl}api/module-versions/${versionId}/with-blocks`; // Utilise l'URL de base de l'environnement
    return firstValueFrom(this.httpClient.get<IModuleVersionResponse>(specificUrl)
      .pipe(
        map(data => ({
          ...new ModuleVersion(
            data.moduleId, data.version, data.published, data.createdBy, data.createdAt,
            data.updatedAt, data.gameSystemId, data.language, data.id
          ),
          blocks: data.blocks.map((blockData: IBlockData) => createBlock(blockData))
        }))
      ));
  }
}
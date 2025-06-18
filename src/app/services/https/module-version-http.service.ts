import { Injectable } from '@angular/core';
import { BaseHttpService } from './base-http.service';
import { ModuleVersion } from '../../classes/ModuleVersion';
import { firstValueFrom } from 'rxjs';
import { cleanModuleVersionForSave } from '../../utils/cleanBlocksForSave';

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
    // Nettoyer les IDs temporaires des blocs avant l'envoi
    const cleanedVersion = cleanModuleVersionForSave(moduleVersion);
    
    // Chemin spécifique
    const specificUrl = `${this.baseApiUrl}/module/${moduleId}`;
    // T=ModuleVersion, B=ModuleVersion
    return firstValueFrom(this.httpClient.post<ModuleVersion>(specificUrl, cleanedVersion));
  }

  /** PUT /api/versions/{id} */
  updateModuleVersion(versionId: number, moduleVersion: ModuleVersion): Promise<ModuleVersion> {
    // Nettoyer les IDs temporaires des blocs avant l'envoi
    const cleanedVersion = cleanModuleVersionForSave(moduleVersion);
    
    // Appel standard, T=ModuleVersion, B=ModuleVersion
    return this.put<ModuleVersion, ModuleVersion>(cleanedVersion, versionId);
  }

  /** DELETE /api/versions/{id} */
  deleteModuleVersion(versionId: number): Promise<void> {
    // Appel standard, le backend renvoie 204 No Content
    return this.delete<void>(versionId);
  }
}

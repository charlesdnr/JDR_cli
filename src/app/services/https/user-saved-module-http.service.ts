import { Injectable } from '@angular/core';
import { BaseHttpService } from './base-http.service';
import { UserSavedModule } from '../../classes/UserSavedModule';
import { firstValueFrom } from 'rxjs'; // Import nécessaire

@Injectable({
  providedIn: 'root'
})
export class UserSavedModuleHttpService extends BaseHttpService {

  constructor() {
    super('api/user/saved-modules');
  }

  /** GET /api/user/saved-modules */
  getAllUserSavedModules(userId: number): Promise<UserSavedModule[]> {
    return this.get<UserSavedModule[]>(`user/${userId}`);
  }

  getAllUserSavedModulesByUserIdByFolderId(userId: number, folderId: number): Promise<UserSavedModule[]> {
    return this.get<UserSavedModule[]>(`user/${userId}/folder/${folderId}`);
  }

  /** GET /api/user/saved-modules/{savedModuleId} */
  getUserSavedModuleById(savedModuleId: number): Promise<UserSavedModule> {
    return this.get<UserSavedModule>(savedModuleId);
  }

  /** GET /api/user/saved-modules/folder/{folderId} */
  getSavedModulesByFolder(folderId: number): Promise<UserSavedModule[]> {
    // Chemin spécifique
    const specificUrl = `${this.baseApiUrl}/folder/${folderId}`;
    return firstValueFrom(this.httpClient.get<UserSavedModule[]>(specificUrl));
  }

  /** POST /api/user/saved-modules */
  saveModule(savedModule: UserSavedModule): Promise<UserSavedModule> {
    // T=UserSavedModule, B=UserSavedModule
    return this.post<UserSavedModule, UserSavedModule>(savedModule);
  }

  /** PUT /api/user/saved-modules/{savedModuleId} */
  updateSavedModule(savedModuleId: number, savedModule: UserSavedModule): Promise<UserSavedModule> {
    // T=UserSavedModule, B=UserSavedModule
    return this.put<UserSavedModule, UserSavedModule>(savedModule, savedModuleId);
  }

  /** DELETE /api/user/saved-modules/{savedModuleId} */
  unsaveModule(savedModuleId: number): Promise<void> {
    // Supposons 204 No Content
    return this.delete<void>(savedModuleId);
  }
}
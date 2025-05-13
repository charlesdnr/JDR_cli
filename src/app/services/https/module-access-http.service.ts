import { inject, Injectable } from '@angular/core';
import { BaseHttpService } from './base-http.service';
import { ModuleAccess } from '../../classes/ModuleAccess';
import { AccessRight } from '../../enum/AccessRight';
import { firstValueFrom } from 'rxjs'; 
import { UserHttpService } from './user-http.service';

@Injectable({
  providedIn: 'root'
})
export class ModuleAccessHttpService extends BaseHttpService {
  private authService = inject(UserHttpService);

  constructor() {
    super('api/module-access');
  }

  /** GET /api/module-access/{id} */
  getModuleAccessById(id: number): Promise<ModuleAccess> {
    // Appel standard
    return this.get<ModuleAccess>(id);
  }

  /** GET /api/module-access/module/{moduleId} */
  getModuleAccessByModuleId(moduleId: number): Promise<ModuleAccess[]> {
    // Chemin spécifique
    const specificUrl = `${this.baseApiUrl}/module/${moduleId}`;
    return firstValueFrom(this.httpClient.get<ModuleAccess[]>(specificUrl));
  }

  /** GET /api/module-access/user/{userId}/module/{moduleId} */
  getModuleAccessByUserAndModule(userId: number, moduleId: number): Promise<ModuleAccess> {
    // Chemin spécifique
    const specificUrl = `${this.baseApiUrl}/user/${userId}/module/${moduleId}`;
    return firstValueFrom(this.httpClient.get<ModuleAccess>(specificUrl));
  }

  /** POST /api/module-access/module/{moduleId}/user/{userId} */
  createModuleAccess(moduleId: number, userId: number): Promise<ModuleAccess> {
    // Chemin spécifique, corps vide {}
    const specificUrl = `${this.baseApiUrl}/module/${moduleId}/user/${userId}/currentUser/${this.authService.currentJdrUser()?.id}`;
    // <ModuleAccess, {}> car le corps envoyé est un objet vide
    return firstValueFrom(this.httpClient.post<ModuleAccess>(specificUrl, {}));
  }

  /** DELETE /api/module-access/{id} */
  deleteModuleAccess(id: number): Promise<ModuleAccess> {
    // Appel standard (le backend renvoie le DTO avant 204)
    return this.delete<ModuleAccess>(id + `/currentUser/${this.authService.currentJdrUser()?.id}`);
  }

  /** PATCH /api/module-access/{id}/rights/{accessRight} */
  toggleAccessRight(id: number, accessRight: AccessRight): Promise<ModuleAccess> {
    // Chemin spécifique, corps vide {}
    const specificUrl = `${this.baseApiUrl}/${id}/rights/${accessRight}/currentUser/${this.authService.currentJdrUser()?.id}`;
    // <ModuleAccess, {}> car le corps envoyé est un objet vide
    return firstValueFrom(this.httpClient.patch<ModuleAccess>(specificUrl, {}));
  }
}
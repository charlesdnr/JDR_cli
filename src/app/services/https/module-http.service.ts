import { inject, Injectable } from '@angular/core';
import { BaseHttpService } from './base-http.service';
import { ModuleRequest } from '../../classes/ModuleRequest';
import { Module } from '../../classes/Module';
import { UserHttpService } from './user-http.service';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ModuleHttpService extends BaseHttpService {
  private authService = inject(UserHttpService);

  constructor() {
    super('api/modules');
  }

  /** GET /api/modules */
  getAllModules(): Promise<Module[]> {
    return this.get<Module[]>();
  }

  /** GET /api/modules/{id} */
  getModuleById(id: number): Promise<Module> {
    return this.get<Module>(id);
  }

  /** POST /api/modules */
  createModule(moduleRequest: ModuleRequest): Promise<Module> {
    // Appel standard, T=ModuleResponse, B=ModuleRequest
    return this.post<Module, ModuleRequest>(moduleRequest);
  }

  /** PUT /api/modules/{id} */
  updateModule(id: number, moduleRequest: ModuleRequest): Promise<Module> {
    // Appel standard, T=ModuleResponse, B=ModuleRequest
    return this.put<Module, ModuleRequest>(moduleRequest, id+`/currentUser/${this.authService.currentJdrUser()?.id}`);
  }

  /** DELETE /api/modules/{id} */
  deleteModule(id: number): Promise<void> {
    // Appel standard, le backend renvoie 204 No Content
    return this.delete<void>(id);
  }

  getMostSavedModules(page: number = 0, limit: number = 10): Promise<Module[]> {
    const url = `${this.baseApiUrl}/most-saved?page=${page}&limit=${limit}`;
    return firstValueFrom(this.httpClient.get<Module[]>(url));
  }
  
  /** GET /api/modules/most-recent */
  getMostRecentModules(page: number = 0, limit: number = 10): Promise<Module[]> {
    const url = `${this.baseApiUrl}/most-recent?page=${page}&limit=${limit}`;
    return firstValueFrom(this.httpClient.get<Module[]>(url));
  }
}

import { Injectable } from '@angular/core';
import { BaseHttpService } from './base-http.service';
import { ModuleResponse } from '../../classes/ModuleResponse';
import { ModuleRequest } from '../../classes/ModuleRequest';

@Injectable({
  providedIn: 'root'
})
export class ModuleHttpService extends BaseHttpService {

  constructor() {
    super('api/modules');
  }

  /** GET /api/modules */
  getAllModules(): Promise<ModuleResponse[]> {
    return this.get<ModuleResponse[]>();
  }

  /** GET /api/modules/{id} */
  getModuleById(id: number): Promise<ModuleResponse> {
    return this.get<ModuleResponse>(id);
  }

  /** POST /api/modules */
  createModule(moduleRequest: ModuleRequest): Promise<ModuleResponse> {
    // Appel standard, T=ModuleResponse, B=ModuleRequest
    return this.post<ModuleResponse, ModuleRequest>(moduleRequest);
  }

  /** PUT /api/modules/{id} */
  updateModule(id: number, moduleRequest: ModuleRequest): Promise<ModuleResponse> {
    // Appel standard, T=ModuleResponse, B=ModuleRequest
    return this.put<ModuleResponse, ModuleRequest>(moduleRequest, id);
  }

  /** DELETE /api/modules/{id} */
  deleteModule(id: number): Promise<void> {
    // Appel standard, le backend renvoie 204 No Content
    return this.delete<void>(id);
  }
}
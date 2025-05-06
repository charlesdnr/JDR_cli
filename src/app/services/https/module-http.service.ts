import { Injectable } from '@angular/core';
import { BaseHttpService } from './base-http.service';
import { ModuleRequest } from '../../classes/ModuleRequest';
import { Module } from '../../classes/Module';

@Injectable({
  providedIn: 'root'
})
export class ModuleHttpService extends BaseHttpService {

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
    return this.put<Module, ModuleRequest>(moduleRequest, id);
  }

  /** DELETE /api/modules/{id} */
  deleteModule(id: number): Promise<void> {
    // Appel standard, le backend renvoie 204 No Content
    return this.delete<void>(id);
  }
}

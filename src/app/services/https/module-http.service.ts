import { inject, Injectable } from '@angular/core';
import { BaseHttpService } from './base-http.service';
import { ModuleRequest } from '../../classes/ModuleRequest';
import { Module } from '../../classes/Module';
import { UserHttpService } from './user-http.service';
import { firstValueFrom } from 'rxjs';
import { ModuleResponseSummaryDTO } from '../../interfaces/ModuleResponseSummaryDTO';
import { ModuleSummary } from '../../classes/ModuleSummary';
import { plainToClass } from 'class-transformer';

interface SearchParams {
  page?: number;
  size?: number;
  sort?: string;
  search?: string;
  tagIds?: string;
  gameSystemId?: number;
  moduleType?: string;
  published?: boolean;
}

interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

@Injectable({
  providedIn: 'root',
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

  /** GET /api/modules/summary/{userId} */
  getModulesSummaryByUserId(userId: number): Promise<ModuleSummary[]> {
    const url = `${this.baseApiUrl}/summary/${userId}`;
    return firstValueFrom(
      this.httpClient.get<ModuleResponseSummaryDTO[]>(url)
    ).then(dtos => dtos.map(dto => plainToClass(ModuleSummary, dto)));
  }

  /** POST /api/modules */
  createModule(moduleRequest: ModuleRequest): Promise<Module> {
    // Appel standard, T=ModuleResponse, B=ModuleRequest
    return this.post<Module, ModuleRequest>(moduleRequest);
  }

  /** PUT /api/modules/{id} */
  updateModule(id: number, moduleRequest: ModuleRequest): Promise<Module> {
    // Appel standard, T=ModuleResponse, B=ModuleRequest
    return this.put<Module, ModuleRequest>(
      moduleRequest,
      id + `/currentUser/${this.authService.currentJdrUser()?.id}`
    );
  }

  /** DELETE /api/modules/{id} */
  deleteModule(id: number): Promise<void> {
    // Appel standard, le backend renvoie 204 No Content
    return this.delete<void>(id);
  }

  /** GET /api/modules/most-saved */
  getMostSavedModules(page = 0, limit = 10): Promise<Module[]> {
    const url = `${this.baseApiUrl}/most-saved?page=${page}&limit=${limit}`;
    return firstValueFrom(this.httpClient.get<Module[]>(url));
  }

  getMostRatedModules(page = 0, limit = 10): Promise<Module[]> {
    const url = `${this.baseApiUrl}/most-rated?page=${page}&limit=${limit}`;
    return firstValueFrom(this.httpClient.get<Module[]>(url));
  }

  /** GET /api/modules/most-recent */
  getMostRecentModules(
    page = 0,
    limit = 10
  ): Promise<Module[]> {
    const url = `${this.baseApiUrl}/most-recent?page=${page}&limit=${limit}`;
    return firstValueFrom(this.httpClient.get<Module[]>(url));
  }

  /**
   * Recherche paginée de modules avec filtres
   * GET /api/modules/search
   */
  searchModules(params: SearchParams): Promise<PaginatedResponse<Module>> {
    const queryParams = new URLSearchParams();

    // Ajouter les paramètres de pagination
    queryParams.append('page', (params.page || 0).toString());
    queryParams.append('size', (params.size || 12).toString());

    if (params.sort) {
      queryParams.append('sort', params.sort);
    }

    // Ajouter les filtres
    if (params.search) {
      queryParams.append('search', params.search);
    }

    if (params.tagIds) {
      queryParams.append('tagIds', params.tagIds);
    }

    if (params.gameSystemId) {
      queryParams.append('gameSystemId', params.gameSystemId.toString());
    }

    if (params.moduleType) {
      queryParams.append('moduleType', params.moduleType);
    }

    if (params.published !== undefined) {
      queryParams.append('published', params.published.toString());
    }

    const url = `${this.baseApiUrl}/search?${queryParams.toString()}`;
    return firstValueFrom(this.httpClient.get<PaginatedResponse<Module>>(url));
  }

  /**
   * Recherche de modules par titre ou description
   * GET /api/modules/search/text
   */
  searchModulesByText(
    searchText: string,
    page = 0,
    size = 10
  ): Promise<PaginatedResponse<Module>> {
    return this.searchModules({
      page,
      size,
      search: searchText,
      published: true,
    });
  }

  /**
   * Recherche de modules par tags
   * GET /api/modules/search/tags
   */
  searchModulesByTags(
    tagIds: number[],
    page = 0,
    size = 10
  ): Promise<PaginatedResponse<Module>> {
    return this.searchModules({
      page,
      size,
      tagIds: tagIds.join(','),
      published: true,
    });
  }

  /**
   * Recherche de modules par système de jeu
   * GET /api/modules/search/game-system
   */
  searchModulesByGameSystem(
    gameSystemId: number,
    page = 0,
    size = 10
  ): Promise<PaginatedResponse<Module>> {
    return this.searchModules({
      page,
      size,
      gameSystemId,
      published: true,
    });
  }

  /**
   * Obtenir les modules publics avec pagination
   * GET /api/modules/public
   */
  getPublicModules(
    page = 0,
    size = 12,
    sort = 'createdAt,desc'
  ): Promise<PaginatedResponse<Module>> {
    return this.searchModules({
      page,
      size,
      sort,
      published: true,
    });
  }

  public duplicateModule(moduleId: number): Promise<Module> {
    const url = `${this.baseApiUrl}/${moduleId}/duplicate`;
    return firstValueFrom(this.httpClient.post<Module>(url, {}));
  }
}

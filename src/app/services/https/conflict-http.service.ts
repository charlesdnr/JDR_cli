import { Injectable } from '@angular/core';
import { BaseHttpService } from './base-http.service';
import { firstValueFrom } from 'rxjs';
import { Module } from '../../classes/Module';
import { ModuleVersion } from '../../classes/ModuleVersion';
import { Block } from '../../classes/Block';
import { ConflictDTO } from '../../interfaces/conflict/ConflictDTO';
import { ConflictResolutionRequestDTO } from '../../interfaces/conflict/ConflictResolutionRequestDTO';

export interface MergeResult {
    success: boolean;
    type?: 'SUCCESS' | 'CONFLICT' | 'ERROR';
    data?: any;
    conflict?: ConflictDTO;
    error?: string;
    errorMessage?: string;
  }
  
  export interface ResolutionSuggestions {
    autoResolveOptions: Array<{
      strategy: string;
      description: string;
    }>;
    recommendedStrategy: string;
    conflictComplexity: 'simple' | 'moderate' | 'complex';
  }

@Injectable({
  providedIn: 'root'
})
export class ConflictHttpService extends BaseHttpService {

  constructor() {
    super('api/conflicts');
  }

  /** GET /api/conflicts/{conflictId} */
  getConflict(conflictId: string): Promise<ConflictDTO> {
    return this.get<ConflictDTO>(conflictId);
  }

  /** GET /api/conflicts/active */
  getActiveConflicts(): Promise<ConflictDTO[]> {
    const url = `${this.baseApiUrl}/active`;
    return firstValueFrom(this.httpClient.get<ConflictDTO[]>(url));
  }

  /** POST /api/conflicts/{conflictId}/resolve */
  resolveConflict(conflictId: string, resolution: ConflictResolutionRequestDTO): Promise<MergeResult> {
    const url = `${this.baseApiUrl}/${conflictId}/resolve`;
    return firstValueFrom(this.httpClient.post<MergeResult>(url, resolution));
  }

  /** POST /api/conflicts/{conflictId}/auto-resolve */
  autoResolveConflict(conflictId: string, strategy: string = 'take_user'): Promise<MergeResult> {
    const url = `${this.baseApiUrl}/${conflictId}/auto-resolve?strategy=${strategy}`;
    return firstValueFrom(this.httpClient.post<MergeResult>(url, {}));
  }

  /** DELETE /api/conflicts/{conflictId} */
  cancelConflict(conflictId: string): Promise<void> {
    return this.delete<void>(conflictId);
  }

  /** PUT /api/conflicts/module-version/{id}/smart-update */
  smartUpdateModuleVersion(id: number, moduleVersion: ModuleVersion): Promise<MergeResult> {
    const url = `${this.baseApiUrl}/module-version/${id}/smart-update`;
    return firstValueFrom(this.httpClient.put<MergeResult>(url, moduleVersion));
  }

  /** PUT /api/conflicts/block/{id}/smart-update */
  smartUpdateBlock(id: number, block: Block): Promise<MergeResult> {
    const url = `${this.baseApiUrl}/block/${id}/smart-update`;
    return firstValueFrom(this.httpClient.put<MergeResult>(url, block));
  }

  /** GET /api/conflicts/{conflictId}/suggestions */
  getResolutionSuggestions(conflictId: string): Promise<ResolutionSuggestions> {
    const url = `${this.baseApiUrl}/${conflictId}/suggestions`;
    return firstValueFrom(this.httpClient.get<ResolutionSuggestions>(url));
  }
}
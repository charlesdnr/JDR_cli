import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ModuleComment } from '../../classes/ModuleComment';
import { BaseHttpService } from './base-http.service';

@Injectable({
  providedIn: 'root',
})
export class ModuleCommentService extends BaseHttpService {

  constructor() {
    super('api/comments');
  }

  public getModuleCommentById(id: number): Promise<ModuleComment> {
    return firstValueFrom(this.httpClient.get<ModuleComment>(`${this.baseApiUrl}/${id}`));
  }

  public getModuleCommentsByModule(id: number, page = 0, limit = 20): Promise<ModuleComment[]> {
    return firstValueFrom(this.httpClient.get<ModuleComment[]>(`${this.baseApiUrl}/module/${id}`, {
      params: {
        page: page.toString(),
        size: limit.toString()
      }
    }));
  }

  public getModuleCommentsByModuleVersion(id: number, page = 0, limit = 20): Promise<ModuleComment[]> {
    return firstValueFrom(this.httpClient.get<ModuleComment[]>(`${this.baseApiUrl}/version/${id}`, {
      params: {
        page: page.toString(),
        size: limit.toString()
      }
    }));
  }

  public createModuleComment(moduleComment: ModuleComment): Promise<ModuleComment> {
    return firstValueFrom(this.httpClient.post<ModuleComment>(this.baseApiUrl, moduleComment));
  }

  public updateModuleComment(moduleComment: ModuleComment): Promise<ModuleComment> {
    return firstValueFrom(this.httpClient.put<ModuleComment>(`${this.baseApiUrl}/${moduleComment.id}`, moduleComment));
  }

    public deleteModuleComment(id: number): Promise<void> {
        return firstValueFrom(this.httpClient.delete<void>(`${this.baseApiUrl}/${id}`));
    }
}

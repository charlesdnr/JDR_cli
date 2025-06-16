import { Injectable } from '@angular/core';
import { BaseHttpService } from './base-http.service';
import { Tag } from '../../classes/Tag';
import { firstValueFrom } from 'rxjs';
import { TagRequest } from '../../interfaces/TagRequest';

@Injectable({
  providedIn: 'root',
})
export class TagHttpService extends BaseHttpService {
  
  constructor() {
    super('api/tags');
  }

  /** GET /api/tags */
  getAllTags(): Promise<Tag[]> {
    return firstValueFrom(this.httpClient.get<Tag[]>(this.baseApiUrl));
  }

  /** GET /api/tags/{id} */
  getTagById(id: number): Promise<Tag> {
    return this.get<Tag>(id);
  }

  /** GET /api/tags/search/{query} */
  searchTags(query: string): Promise<Tag[]> {
    // Chemin spécifique
    const specificUrl = `${this.baseApiUrl}/search/${query}`;
    return firstValueFrom(this.httpClient.get<Tag[]>(specificUrl));
  }

  /** POST /api/tags */
  createTag(tag: TagRequest): Promise<Tag> {
    return this.post<Tag, TagRequest>(tag);
  }

  /** DELETE /api/tags/{id} */
  deleteTag(id: number): Promise<void> {
    return this.delete<void>(id);
  }

  /** PUT /api/tags/{id} */
  updateTag(id: number, tag: TagRequest): Promise<Tag> {
    return this.put<Tag, TagRequest>(tag, id);
  }

  get15tags(): Promise<Tag[]> {
    return this.get<Tag[]>('most-used');
  }

  getTagsByModuleId(moduleId: number): Promise<Tag[]> {
    return this.get<Tag[]>('module/' + moduleId);
  }

  deleteModuleOfTags(tagId: number, moduleId: number){
    return this.delete<void>(tagId + '/modules/' + moduleId)
  }
}

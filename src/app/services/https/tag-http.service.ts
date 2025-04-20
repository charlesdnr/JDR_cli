import { Injectable } from '@angular/core';
import { BaseHttpService } from './base-http.service';
import { Tag } from '../../classes/Tag';
import { firstValueFrom } from 'rxjs'; // Import nécessaire

@Injectable({
  providedIn: 'root'
})
export class TagHttpService extends BaseHttpService {

  constructor() {
    super('api/tags');
  }

  /** GET /api/tags */
  getAllTags(): Promise<Tag[]> {
    return this.get<Tag[]>();
  }

  /** GET /api/tags/{id} */
  getTagById(id: number): Promise<Tag> {
    return this.get<Tag>(id);
  }

  /** GET /api/tags/name/{name} */
  getTagByName(name: string): Promise<Tag> {
    // Chemin spécifique
    const specificUrl = `${this.baseApiUrl}/name/${name}`;
    return firstValueFrom(this.httpClient.get<Tag>(specificUrl));
  }

  /** GET /api/tags/search/{query} */
  searchTags(query: string): Promise<Tag[]> {
    // Chemin spécifique
    const specificUrl = `${this.baseApiUrl}/search/${query}`;
    return firstValueFrom(this.httpClient.get<Tag[]>(specificUrl));
  }

  /** POST /api/tags */
  createTag(tag: Tag): Promise<Tag> {
    // Appel standard, T=Tag, B=Tag
    return this.post<Tag, Tag>(tag);
  }

  /** DELETE /api/tags/{id} */
  deleteTag(id: number): Promise<void> {
    // Appel standard, backend renvoie 204 No Content
    return this.delete<void>(id);
  }

  /** PUT /api/tags/{id} */
  updateTag(id: number, tag: Tag): Promise<Tag> {
    // Appel standard, T=Tag, B=Tag
    return this.put<Tag, Tag>(tag, id);
  }
}
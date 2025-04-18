import { Injectable } from '@angular/core';
import { BaseHttpService } from './base-http.service';
import { Tag } from '../../classes/Tag'; // Vérifiez l'import

@Injectable({
  providedIn: 'root'
})
export class TagHttpService extends BaseHttpService {

  constructor() {
    // Correspond à @RequestMapping("/api/tags")
    super('api/tags');
  }

  /**
   * Récupère tous les tags.
   * GET /api/tags
   */
  getAllTags(): Promise<Tag[]> {
    return this.get<Tag[]>();
  }

  /**
   * Récupère un tag par son ID.
   * GET /api/tags/{id}
   * @param id L'ID du tag.
   */
  getTagById(id: number): Promise<Tag> {
    return this.get<Tag>(id);
  }

  /**
   * Récupère un tag par son nom.
   * GET /api/tags/name/{name}
   * @param name Le nom du tag.
   */
  getTagByName(name: string): Promise<Tag> {
    return this.get<Tag>(undefined, `name/${name}`);
  }

  /**
   * Recherche des tags correspondant à une requête.
   * GET /api/tags/search/{query}
   * @param query La chaîne de recherche.
   */
  searchTags(query: string): Promise<Tag[]> {
    return this.get<Tag[]>(undefined, `search/${query}`);
  }

  /**
   * Crée un nouveau tag.
   * POST /api/tags
   * @param tag Les données du tag à créer.
   */
  createTag(tag: Tag): Promise<Tag> {
    return this.post<Tag>(tag);
  }

  /**
   * Supprime un tag.
   * DELETE /api/tags/{id}
   * @param id L'ID du tag à supprimer.
   */
  deleteTag(id: number): Promise<void> {
    // Le contrôleur renvoie Void avec NO_CONTENT
    return this.delete<void>(id);
  }

  /**
   * Met à jour un tag existant.
   * PUT /api/tags/{id}
   * @param id L'ID du tag à mettre à jour.
   * @param tag Les nouvelles données du tag.
   */
  updateTag(id: number, tag: Tag): Promise<Tag> {
    return this.put<Tag>(tag, id);
  }
}
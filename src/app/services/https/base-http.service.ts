import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable()
export abstract class BaseHttpService {
  protected httpClient = inject(HttpClient);
  protected baseApiUrl: string;

  constructor(resourceBasePath: string) {
    // Assure que le chemin commence par / s'il n'est pas vide
    const normalizedPath = resourceBasePath && !resourceBasePath.startsWith('/')
      ? `/${resourceBasePath}`
      : resourceBasePath;
    // Supprime un éventuel / à la fin pour éviter les doubles //
    const cleanPath = normalizedPath.endsWith('/') ? normalizedPath.slice(0, -1) : normalizedPath;
    this.baseApiUrl = `${environment.apiUrl.replace(/\/$/, '')}${cleanPath}`; // Construit l'URL de base complète
  }

  /**
   * Construit l'URL pour une ressource spécifique par ID.
   * @param id - ID (chaîne ou nombre) à ajouter après l'URL de base.
   */
  protected buildUrlWithId(id: string | number): string {
    return `${this.baseApiUrl}/${id}`;
  }

  /**
   * Effectue une requête GET (soit sur la base, soit sur un ID).
   * @template T Le type de la réponse attendue.
   * @param id ID optionnel (chaîne ou nombre) pour récupérer une ressource spécifique.
   */
  get<T>(id?: string | number): Promise<T> {
    const url = id !== undefined ? this.buildUrlWithId(id) : this.baseApiUrl;
    return firstValueFrom(this.httpClient.get<T>(url));
  }

  /**
   * Effectue une requête POST sur l'URL de base.
   * @template T Le type de la réponse attendue.
   * @template B Le type du corps de la requête envoyé.
   * @param body Corps de la requête.
   */
  post<T, B>(body: B): Promise<T> {
    // POST se fait généralement sur l'URL de base de la collection
    return firstValueFrom(this.httpClient.post<T>(this.baseApiUrl, body));
  }

  /**
   * Effectue une requête PUT sur une ressource spécifique par ID.
   * @template T Le type de la réponse attendue.
   * @template B Le type du corps de la requête envoyé.
   * @param body Corps de la requête.
   * @param id ID (chaîne ou nombre) de la ressource à mettre à jour.
   */
  put<T, B>(body: B, id: string | number): Promise<T> {
    return firstValueFrom(this.httpClient.put<T>(this.buildUrlWithId(id), body));
  }

  /**
   * Effectue une requête PATCH sur une ressource spécifique par ID.
   * @template T Le type de la réponse attendue.
   * @template B Le type du corps de la requête envoyé (peut être Partial<...>).
   * @param body Corps de la requête (partiel).
   * @param id ID (chaîne ou nombre) de la ressource à mettre à jour partiellement.
   */
  patch<T, B>(body: B, id: string | number): Promise<T> {
    return firstValueFrom(this.httpClient.patch<T>(this.buildUrlWithId(id), body));
  }

  /**
   * Effectue une requête DELETE sur une ressource spécifique par ID.
   * @template T Le type de la réponse attendue (souvent void ou l'objet supprimé).
   * @param id ID (chaîne ou nombre) de la ressource à supprimer.
   */
  delete<T>(id: string | number): Promise<T> {
    return firstValueFrom(this.httpClient.delete<T>(this.buildUrlWithId(id)));
  }
}
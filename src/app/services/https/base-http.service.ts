import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable()
export abstract class BaseHttpService {
  protected httpClient = inject(HttpClient);
  protected apiUrl = environment.apiUrl;
  protected baseResourcePath: string; // Gardons une trace du chemin de base

  /**
   * Le constructeur est protégé. Les classes filles doivent l'appeler via super().
   * @param resourceBasePath Le chemin relatif vers la ressource API (ex: 'api/block').
   */
  constructor(resourceBasePath: string) {
    this.baseResourcePath = resourceBasePath; // Chemin sans le slash initial
    this.apiUrl = `${environment.apiUrl}${this.baseResourcePath}`; // URL complète de base
  }

  /**
   * Construit l'URL complète pour une requête.
   * @param pathSuffix - Suffixe de chemin optionnel (ex: '/{id}' ou '/sub-resource'). Commence par '/' si nécessaire.
   * @param id - ID optionnel à ajouter directement après le chemin de base.
   */
  protected buildUrl(pathSuffix: string = '', id?: any): string {
    const idPath = id ? `/${id}` : '';
    // Assure que pathSuffix commence par / s'il n'est pas vide et qu'il n'y a pas d'id
    // Ou s'il y a un id, le suffixe doit commencer par /
    const formattedSuffix = pathSuffix && (id || !pathSuffix.startsWith('/')) && !pathSuffix.startsWith('/') ? `/${pathSuffix}` : pathSuffix;

    // Combine l'URL de base, l'ID (si présent) et le suffixe formaté
    return `${this.apiUrl}${idPath}${formattedSuffix}`;
  }


  /**
   * Effectue une requête GET.
   * @param id ID optionnel pour récupérer une ressource spécifique.
   * @param pathSuffix Suffixe de chemin optionnel pour des routes spécifiques (ex: '/search').
   */
  get<T>(id?: any, pathSuffix: string = ''): Promise<T> {
    return firstValueFrom(this.httpClient.get<T>(this.buildUrl(pathSuffix, id)));
  }

  /**
   * Effectue une requête POST.
   * @param body Corps de la requête.
   * @param pathSuffix Suffixe de chemin optionnel pour des routes POST spécifiques.
   */
  post<T>(body: any, pathSuffix: string = ''): Promise<T> {
    return firstValueFrom(this.httpClient.post<T>(this.buildUrl(pathSuffix), body));
  }

  /**
   * Effectue une requête PUT sur une ressource spécifique (base + ID).
   * @param body Corps de la requête.
   * @param id ID de la ressource à mettre à jour.
   * @param pathSuffix Suffixe de chemin optionnel.
   */
  put<T>(body: any, id: any, pathSuffix: string = ''): Promise<T> {
    // PUT cible généralement une ressource spécifique par ID
    return firstValueFrom(this.httpClient.put<T>(this.buildUrl(pathSuffix, id), body));
  }

  /**
   * Effectue une requête PATCH sur une ressource spécifique (base + ID).
   * @param body Corps de la requête (partiel).
   * @param id ID de la ressource à mettre à jour partiellement.
   * @param pathSuffix Suffixe de chemin optionnel.
   */
  patch<T>(body: any, id: any, pathSuffix: string = ''): Promise<T> {
     // PATCH cible généralement une ressource spécifique par ID
    return firstValueFrom(this.httpClient.patch<T>(this.buildUrl(pathSuffix, id), body));
  }

  /**
   * Effectue une requête DELETE sur une ressource spécifique (base + ID).
   * @param id ID de la ressource à supprimer.
   * @param pathSuffix Suffixe de chemin optionnel.
   */
  delete<T>(id: any, pathSuffix: string = ''): Promise<T> {
     // DELETE cible généralement une ressource spécifique par ID
    return firstValueFrom(this.httpClient.delete<T>(this.buildUrl(pathSuffix, id)));
  }
}
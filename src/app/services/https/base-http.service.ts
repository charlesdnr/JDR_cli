import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable()
export abstract class BaseHttpService {
  protected httpClient = inject(HttpClient);
  protected apiUrl = environment.apiUrl;

  /**
   * Le constructeur est protégé. Les classes filles doivent l'appeler via super().
   * @param resourceBasePath Le chemin relatif vers la ressource API (ex: 'api/block').
   */
  constructor(resourceBasePath: string) {
    this.apiUrl = this.apiUrl + resourceBasePath;
  }

  /**
   * Effectue une requête GET.
   * @param params Paramètres de requête.
   */
  get<T>(id?: any): Promise<T> {
    return firstValueFrom(this.httpClient.get<T>(this.apiUrl + id ? `/${id}` : ''));
  }

  /**
   * Effectue une requête POST sur le chemin de base.
   * @param body Corps de la requête.
   */
  post<T>(body: any): Promise<T> {
    return firstValueFrom(this.httpClient.post<T>(this.apiUrl, body));
  }

  /**
   * Effectue une requête PUT.
   * @param body Corps de la requête.
   */
  put<T>(body: any, id: any): Promise<T> {
    const formatid = id ? `/${id}` : ''
    return firstValueFrom(this.httpClient.put<T>(this.apiUrl + formatid, body));
  }

  /**
   * Effectue une requête PATCH
   * @param body Corps de la requête.
   */
  patch<T>(body: any): Promise<T> {
    return firstValueFrom(this.httpClient.patch<T>(this.apiUrl, body));
  }

  /**
   * Effectue une requête DELETE sur un élément spécifique (base + ID).
   * @param params Paramètres de requête.
   */
  delete<T>(id: any): Promise<T> {
    const formatid = id ? `/${id}` : ''
    return firstValueFrom(this.httpClient.delete<T>(this.apiUrl + formatid));
  }
}
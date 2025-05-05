import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GameSystemService {
  private httpClient = inject(HttpClient);
  private baseApiUrl = environment.apiUrl + 'api/game-system';

  /**
   * Récupère tous les systèmes de jeu disponibles
   */
  async getAllGameSystems(): Promise<any[]> {
    try {
      return await firstValueFrom(
        this.httpClient.get<any[]>(`${this.baseApiUrl}`)
      );
    } catch (error) {
      console.error('Erreur lors de la récupération des systèmes de jeu:', error);
      throw error;
    }
  }

  /**
   * Récupère un système de jeu par son ID
   */
  async getGameSystemById(id: string): Promise<any> {
    try {
      return await firstValueFrom(
        this.httpClient.get<any>(`${this.baseApiUrl}/${id}`)
      );
    } catch (error) {
      console.error(`Erreur lors de la récupération du système de jeu ${id}:`, error);
      throw error;
    }
  }
}
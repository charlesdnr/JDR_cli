import { Injectable } from '@angular/core';
import { BaseHttpService } from './base-http.service';
import { GameSystem } from '../../classes/GameSystem'; // Assurez-vous que l'import est correct

@Injectable({
  providedIn: 'root'
})
export class GameSystemHttpService extends BaseHttpService {

  constructor() {
    super('api/game-system');
  }

  /**
   * Crée un nouveau système de jeu.
   * POST /api/game-system
   * @param gameSystem Les données du système de jeu à créer.
   */
  createGameSystem(gameSystem: GameSystem): Promise<GameSystem> {
    return this.post<GameSystem>(gameSystem);
  }

  /**
   * Récupère un système de jeu par son ID.
   * GET /api/game-system/{id}
   * @param id L'ID du système de jeu.
   */
  getGameSystem(id: number): Promise<GameSystem> {
    return this.get<GameSystem>(id);
  }

  /**
   * Récupère tous les systèmes de jeu.
   * GET /api/game-system
   */
  getAllGameSystems(): Promise<GameSystem[]> {
    return this.get<GameSystem[]>();
  }

  /**
   * Met à jour un système de jeu existant.
   * PUT /api/game-system/{id}
   * @param id L'ID du système de jeu à mettre à jour.
   * @param gameSystem Les nouvelles données du système de jeu.
   */
  updateGameSystem(id: number, gameSystem: GameSystem): Promise<GameSystem> {
    return this.put<GameSystem>(gameSystem, id);
  }

  /**
   * Supprime un système de jeu.
   * DELETE /api/game-system/{id}
   * @param id L'ID du système de jeu à supprimer.
   */
  deleteGameSystem(id: number): Promise<GameSystem> {
    // Le contrôleur Java renvoie le DTO avant le statut NO_CONTENT
    return this.delete<GameSystem>(id);
  }
}
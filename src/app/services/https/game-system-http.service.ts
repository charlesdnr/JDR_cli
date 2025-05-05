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
   * @param gameSystem Les données du système de jeu à créer (Type B).
   */
  createGameSystem(gameSystem: GameSystem): Promise<GameSystem> {
    // T = GameSystem (type de retour), B = GameSystem (type du body)
    return this.post<GameSystem, GameSystem>(gameSystem);
  }

  /**
   * Récupère un système de jeu par son ID.
   * GET /api/game-system/{id}
   * @param id L'ID du système de jeu.
   */
  getGameSystem(id: number): Promise<GameSystem> {
    // Pas de body, donc pas besoin du type B
    return this.get<GameSystem>(id);
  }

  /**
   * Récupère tous les systèmes de jeu.
   * GET /api/game-system
   */
  getAllGameSystems(): Promise<GameSystem[]> {
     // Pas de body
    return this.get<GameSystem[]>();
  }

  /**
   * Met à jour un système de jeu existant.
   * PUT /api/game-system/{id}
   * @param id L'ID du système de jeu à mettre à jour.
   * @param gameSystem Les nouvelles données du système de jeu (Type B).
   */
  updateGameSystem(id: number, gameSystem: GameSystem): Promise<GameSystem> {
    // T = GameSystem (type de retour), B = GameSystem (type du body)
    return this.put<GameSystem, GameSystem>(gameSystem, id);
  }

  /**
   * Supprime un système de jeu.
   * DELETE /api/game-system/{id}
   * @param id L'ID du système de jeu à supprimer.
   */
  deleteGameSystem(id: number): Promise<GameSystem> {
    // Pas de body. Le contrôleur Java renvoie le DTO avant le statut NO_CONTENT.
    return this.delete<GameSystem>(id);
  }
}
import { Injectable } from '@angular/core';
import { BaseHttpService } from './base-http.service';
import { Block } from '../../classes/Block';
import { firstValueFrom, map } from 'rxjs';
import { createBlock } from '../../utils/createBlock';
import { IBlockData } from '../../interfaces/IBlockData';

@Injectable({
  providedIn: 'root'
})
export class BlockHttpService extends BaseHttpService {

  constructor() {
    super('api/block'); // Chemin de base de la ressource
  }

  /**
   * Récupère tous les blocs pour une version de module spécifique.
   * GET /api/block/module-version/{moduleVersionId}
   */
  getBlocksByModuleVersionId(moduleVersionId: number): Promise<Block[]> {
    const specificUrl = `${this.baseApiUrl}/module-version/${moduleVersionId}`;
    return firstValueFrom(
      this.httpClient.get<IBlockData[]>(specificUrl)
        .pipe(
          map(blocksData => blocksData.map(blockData => createBlock(blockData)))
        )
    );
  }

  /**
   * Crée un nouveau bloc.
   * POST /api/block
   */
  createBlock(block: Block): Promise<Block> {
    // Utilise httpClient directement pour mapper la réponse IBlockData vers Block
    return firstValueFrom(
      this.httpClient.post<IBlockData>(this.baseApiUrl, block)
        .pipe(
          map(responseData => createBlock(responseData))
        )
    );
  }

  /**
   * Met à jour un bloc existant.
   * PUT /api/block/{id}
   */
  updateBlock(blockId: number, block: Block): Promise<Block> {
    // Utilise httpClient directement pour mapper la réponse IBlockData vers Block
    return firstValueFrom(
      this.httpClient.put<IBlockData>(this.buildUrlWithId(blockId), block)
        .pipe(
          map(responseData => createBlock(responseData))
        )
    );
  }

  /**
   * Supprime un bloc.
   * DELETE /api/block/{id}
   */
  deleteBlock(blockId: number): Promise<Block> {
    // Utilise httpClient directement pour mapper la réponse IBlockData vers Block
    // même si la réponse est souvent vide avec un statut 204, le contrôleur
    // renvoie le DTO avant, donc on essaie de mapper au cas où.
    return firstValueFrom(
      this.httpClient.delete<IBlockData>(this.buildUrlWithId(blockId))
        .pipe(
          map(responseData => responseData ? createBlock(responseData) : null as unknown as Block) // Gère la réponse potentiellement vide
        )
    );
  }
}
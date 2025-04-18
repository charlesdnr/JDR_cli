import { Injectable } from '@angular/core';
import { BaseHttpService } from './base-http.service';
import { Block } from '../../classes/Block';
import { firstValueFrom, map } from 'rxjs';
import { createBlock } from '../../utils/createBlock';
import { IBlockData } from '../../interfaces/IBlockData'; // Assurez-vous que l'import est correct

@Injectable({
  providedIn: 'root'
})
export class BlockHttpService extends BaseHttpService {

  constructor() {
    super('api/block');
  }

  /**
   * Récupère tous les blocs pour une version de module spécifique.
   * GET /api/block/module-version/{moduleVersionId}
   * @param moduleVersionId L'ID de la version du module.
   */
  getBlocksByModuleVersionId(moduleVersionId: number): Promise<Block[]> {
    // Note: L'utilisation de map et createBlock est conservée car elle apporte
    // une transformation utile côté client (instanciation des classes).
    return firstValueFrom(
      this.httpClient.get<IBlockData[]>(this.buildUrl(`module-version/${moduleVersionId}`))
        .pipe(
          map(blocksData => blocksData.map(blockData => createBlock(blockData)))
        )
    );
  }

  /**
   * Crée un nouveau bloc.
   * POST /api/block
   * @param block L'objet Block à créer.
   */
  createBlock(block: Block): Promise<Block> {
    // Utilise IBlockData pour le retour car le backend renvoie potentiellement un DTO simple
    return firstValueFrom(
      this.httpClient.post<IBlockData>(this.buildUrl(), block)
        .pipe(
          map(responseData => createBlock(responseData)) // Transforme la réponse en instance de Block
        )
    );
  }

  /**
   * Met à jour un bloc existant.
   * PUT /api/block/{id}
   * @param blockId L'ID du bloc à mettre à jour.
   * @param block Les données mises à jour du bloc.
   */
  updateBlock(blockId: number, block: Block): Promise<Block> {
    return firstValueFrom(
      this.httpClient.put<IBlockData>(this.buildUrl('', blockId), block)
        .pipe(
          map(responseData => createBlock(responseData)) // Transforme la réponse
        )
    );
  }

  /**
   * Supprime un bloc.
   * DELETE /api/block/{id}
   * @param blockId L'ID du bloc à supprimer.
   */
  deleteBlock(blockId: number): Promise<Block> {
    // Le contrôleur Java renvoie BlockDTO, donc on s'attend à IBlockData ici.
    // Map pour transformer si nécessaire, même si la réponse HTTP est 204 No Content.
    // Le contrôleur Java retourne le DTO supprimé avant de renvoyer NO_CONTENT,
    // donc on peut potentiellement recevoir le DTO dans le corps malgré le statut.
    return firstValueFrom(
      this.httpClient.delete<IBlockData>(this.buildUrl('', blockId))
        .pipe(
          map(responseData => createBlock(responseData)) // Transforme si des données sont retournées
        )
    );
  }
}
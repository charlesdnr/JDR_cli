import { Injectable } from '@angular/core';
import { BaseHttpService } from './base-http.service';
import { Picture } from '../../classes/Picture'; // Vérifiez l'import
import { PictureUsage } from '../../enum/PictureUsage'; // Vérifiez l'import

@Injectable({
  providedIn: 'root'
})
export class PictureHttpService extends BaseHttpService {

  constructor() {
    // Correspond à @RequestMapping("/api/pictures")
    super('api/pictures');
  }

  /**
   * Crée une image associée à un module.
   * POST /api/pictures/module/{moduleId}
   * @param moduleId L'ID du module auquel associer l'image.
   * @param picture Les données de l'image à créer.
   */
  createPictureForModule(moduleId: number, picture: Picture): Promise<Picture> {
    // Note: Le contrôleur attend PictureDTO, on envoie Picture et reçoit PictureDTO
    return this.post<Picture>(picture, `module/${moduleId}`);
  }

  // TODO: Ajouter des méthodes similaires pour d'autres usages si nécessaire
  // Exemple: createPictureForUser(userId: number, picture: Picture): Promise<Picture>
  // POST /api/pictures/user/{userId}
  // return this.post<Picture>(picture, `user/${userId}`);


  /**
   * Récupère les images basées sur leur type d'usage et l'ID de l'entité associée.
   * GET /api/pictures/usage-type/{usageType}/usage-id/{usageId}
   * @param usageType Le type d'usage (BLOCK, USER_PROFILE, MODULE).
   * @param usageId L'ID de l'entité (Block, User, Module).
   */
  getPicturesByUsage(usageType: PictureUsage, usageId: number): Promise<Picture[]> {
    return this.get<Picture[]>(undefined, `usage-type/${usageType}/usage-id/${usageId}`);
  }

  /**
   * Met à jour une image existante.
   * PUT /api/pictures/{id}
   * @param id L'ID de l'image à mettre à jour.
   * @param picture Les nouvelles données de l'image.
   */
  updatePicture(id: number, picture: Picture): Promise<Picture> {
    return this.put<Picture>(picture, id);
  }

  /**
   * Supprime une image.
   * DELETE /api/pictures/{id}
   * @param id L'ID de l'image à supprimer.
   */
  deletePicture(id: number): Promise<Picture> {
    // Le contrôleur renvoie le DTO avant NO_CONTENT
    return this.delete<Picture>(id);
  }
}
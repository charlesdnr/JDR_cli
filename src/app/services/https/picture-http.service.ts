import { Injectable } from '@angular/core';
import { BaseHttpService } from './base-http.service';
import { Picture } from '../../classes/Picture';
import { PictureUsage } from '../../enum/PictureUsage';
import { firstValueFrom } from 'rxjs'; // Import nécessaire

@Injectable({
  providedIn: 'root'
})
export class PictureHttpService extends BaseHttpService {

  constructor() {
    super('api/pictures');
  }

  /** POST /api/pictures/module/{moduleId} */
  createPictureForModule(moduleId: number, picture: Picture): Promise<Picture> {
    // Chemin spécifique
    const specificUrl = `${this.baseApiUrl}/module/${moduleId}`;
    // T=Picture, B=Picture
    return firstValueFrom(this.httpClient.post<Picture>(specificUrl, picture));
  }

  // TODO: Ajouter méthodes pour autres usages si nécessaire (ex: user)
  // createPictureForUser(userId: number, picture: Picture): Promise<Picture> {
  //   const specificUrl = `${this.baseApiUrl}/user/${userId}`;
  //   return firstValueFrom(this.httpClient.post<Picture>(specificUrl, picture));
  // }

  /** GET /api/pictures/usage-type/{usageType}/usage-id/{usageId} */
  getPicturesByUsage(usageType: PictureUsage, usageId: number): Promise<Picture[]> {
    // Chemin spécifique
    const specificUrl = `${this.baseApiUrl}/usage-type/${usageType}/usage-id/${usageId}`;
    return firstValueFrom(this.httpClient.get<Picture[]>(specificUrl));
  }

  /** PUT /api/pictures/{id} */
  updatePicture(id: number, picture: Picture): Promise<Picture> {
    // Appel standard, T=Picture, B=Picture
    return this.put<Picture, Picture>(picture, id);
  }

  /** DELETE /api/pictures/{id} */
  deletePicture(id: number): Promise<Picture> {
    // Appel standard (le backend renvoie le DTO avant 204)
    return this.delete<Picture>(id);
  }
}
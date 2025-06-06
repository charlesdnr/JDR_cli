import { Injectable } from '@angular/core';
import { BaseHttpService } from './base-http.service';
import { FileMetaDataDTO } from '../../interfaces/FileMetaDataDTO';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FileHttpService extends BaseHttpService {
  constructor() {
    super('api/files');
  }

  /**
   * Uploade un fichier vers le serveur
   * POST /api/files/upload
   * @param file Le fichier à uploader
   * @returns Promise<string> l'url firebase du fichier
   */
  uploadFile(file: File): Promise<string> {
    const fd = new FormData();
    fd.append('file', file, file.name);
    
    const uploadUrl = `${this.baseApiUrl}/upload`;
    
    return firstValueFrom(
      this.httpClient.post<string>(uploadUrl, fd, {
        observe: 'body',
        responseType: 'text' as 'json'
      })
    );
  }

  /**
   * Récupère un fichier par son ID
   * GET /api/files/retrieve/{fileId}
   * @param fileId L'ID du fichier à récupérer
   * @returns Promise<FileMetaDataDTO> Les métadonnées et le contenu du fichier
   */
  retrieveFile(fileId: string): Promise<FileMetaDataDTO> {
    const retrieveUrl = `${this.baseApiUrl}/retrieve/${fileId}`;
    return firstValueFrom(this.httpClient.get<FileMetaDataDTO>(retrieveUrl));
  }
}

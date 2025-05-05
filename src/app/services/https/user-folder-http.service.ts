import { Injectable } from '@angular/core';
import { BaseHttpService } from './base-http.service';
import { UserFolder } from '../../classes/UserFolder';

@Injectable({
  providedIn: 'root'
})
export class UserFolderHttpService extends BaseHttpService {

  constructor() {
    super('api/user/folders');
  }

  /** GET /api/user/folders */
  getAllUserFolders(userId: number): Promise<UserFolder[]> {
    return this.get<UserFolder[]>(`user/${userId}`);
  }

  /** GET /api/user/folders/{folderId} */
  getUserFolderById(folderId: number): Promise<UserFolder> {
    return this.get<UserFolder>(folderId);
  }

  /** POST /api/user/folders */
  createUserFolder(folder: UserFolder): Promise<UserFolder> {
    // T=UserFolder, B=UserFolder
    return this.post<UserFolder, UserFolder>(folder);
  }

  /** PUT /api/user/folders/{folderId} */
  updateUserFolder(folderId: number, folder: UserFolder): Promise<UserFolder> {
    // T=UserFolder, B=UserFolder
    return this.put<UserFolder, UserFolder>(folder, folderId);
  }

  /** DELETE /api/user/folders/{folderId} */
  deleteUserFolder(folderId: number): Promise<void> {
    // Supposons 204 No Content
    return this.delete<void>(folderId);
  }
}
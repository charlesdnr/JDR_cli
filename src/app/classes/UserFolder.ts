export class UserFolder {
  folderId?: number;
  userId: number;
  name?: string;
  parentFolder?: number;

  constructor(
      userId: number,
      name?: string,
      parentFolder?: number,
      folderId?: number
  ) {
      this.folderId = folderId;
      this.userId = userId;
      this.name = name;
      this.parentFolder = parentFolder;
  }
}

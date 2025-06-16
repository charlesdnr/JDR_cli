export class UserFolder {
  folderId?: number = undefined
  userId: number;
  name?: string;
  parentFolder?: number;

  constructor(
      userId: number,
      name?: string,
      parentFolder?: number,
  ) {
      this.userId = userId;
      this.name = name;
      this.parentFolder = parentFolder;
  }
}

export class UserSavedModule {
  savedModuleId?: number;
  userId: number;
  moduleId: number;
  moduleVersionId: number;
  folderId?: number;
  alias?: string;

  constructor(
      userId: number,
      moduleId: number,
      moduleVersionId: number,
      folderId?: number,
      alias?: string,
      savedModuleId?: number
  ) {
      this.savedModuleId = savedModuleId;
      this.userId = userId;
      this.moduleId = moduleId;
      this.moduleVersionId = moduleVersionId;
      this.folderId = folderId;
      this.alias = alias;
  }
}

export class ModuleVersion {
  id?: number;
  moduleId: number;
  version: number;
  createdBy?: string;
  createdAt?: string; // Format ISO: "yyyy-MM-dd HH:mm:ss"
  updatedAt?: string; // Format ISO: "yyyy-MM-dd HH:mm:ss"
  published: boolean;
  gameSystemId?: number;
  language?: string;

  constructor(
      moduleId: number,
      version: number,
      published: boolean,
      createdBy?: string,
      createdAt?: string,
      updatedAt?: string,
      gameSystemId?: number,
      language?: string,
      id?: number
  ) {
      this.id = id;
      this.moduleId = moduleId;
      this.version = version;
      this.createdBy = createdBy;
      this.createdAt = createdAt;
      this.updatedAt = updatedAt;
      this.published = published;
      this.gameSystemId = gameSystemId;
      this.language = language;
  }
}
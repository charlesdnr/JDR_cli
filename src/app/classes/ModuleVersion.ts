import { User } from "./User";

export class ModuleVersion {
  id?: number;
  moduleId: number;
  version: number;
  creator?: User;
  createdAt?: string; // Format ISO: "yyyy-MM-dd HH:mm:ss"
  updatedAt?: string; // Format ISO: "yyyy-MM-dd HH:mm:ss"
  published: boolean;
  gameSystemId?: number;
  language?: string;

  constructor(
      moduleId: number,
      version: number,
      published: boolean,
      creator?: User,
      createdAt?: string,
      updatedAt?: string,
      gameSystemId?: number,
      language?: string,
      id?: number
  ) {
      this.id = id;
      this.moduleId = moduleId;
      this.version = version;
      this.creator = creator;
      this.createdAt = createdAt;
      this.updatedAt = updatedAt;
      this.published = published;
      this.gameSystemId = gameSystemId;
      this.language = language;
  }
}

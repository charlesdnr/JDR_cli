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

  constructor();
  constructor(
    moduleId: number,
    version: number,
    creator: User,
    gameSystemId: number,
    published?: boolean,
    createdAt?: string,
    updatedAt?: string,
    language?: string,
    id?: number,
  );
  constructor(
    moduleIdOrVoid?: number,
    version?: number,
    creator?: User,
    gameSystemId?: number,
    published?: boolean,
    createdAt?: string,
    updatedAt?: string,
    language?: string,
    id?: number,
  ) {
    if (moduleIdOrVoid !== undefined) {
      this.moduleId = moduleIdOrVoid;
      this.version = version!;
      this.creator = creator;
      this.gameSystemId = gameSystemId;
      this.published = published || false;
      this.createdAt = createdAt;
      this.updatedAt = updatedAt;
      this.language = language;
      this.id = id;
    } else {
      // Default constructor initialization
      this.moduleId = 0;
      this.version = 0;
      this.published = false;
    }
  }
}

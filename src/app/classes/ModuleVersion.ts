import { Transform } from "class-transformer";
import { User } from "./User";
import { Block } from "./Block";

export class ModuleVersion {
  id?: number;
  moduleId: number;
  version: number;
  creator?: User;
  @Transform(({ value }) => {
    if (value instanceof Date) {
        // Format with time component guaranteed
        return value.toISOString().split('T')[0] + 'T00:00:00';
    }
    // Handle existing string values
    if (typeof value === 'string' && value.length === 10) { // Just a date
        return value + 'T00:00:00';
    }
    return value;
})
  createdAt?: string; // Format ISO: "yyyy-MM-dd HH:mm:ss"
  @Transform(({ value }) => {
    if (value instanceof Date) {
        // Format with time component guaranteed
        return value.toISOString().split('T')[0] + 'T00:00:00';
    }
    // Handle existing string values
    if (typeof value === 'string' && value.length === 10) { // Just a date
        return value + 'T00:00:00';
    }
    return value;
})
  updatedAt?: string; // Format ISO: "yyyy-MM-dd HH:mm:ss"
  published: boolean;
  gameSystemId?: number;
  language?: string;
  blocks: Block[] = []

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

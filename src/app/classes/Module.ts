import { Transform } from "class-transformer";
import { EModuleType } from "../enum/ModuleType";
import { Block } from "./Block";
import { ModuleAccess } from "./ModuleAccess";
import { ModuleVersion } from "./ModuleVersion";
import { Picture } from "./Picture";
import { Tag } from "./Tag";
import { User } from "./User";

export class Module {
  id: number;
  title: string;
  description: string;
  creator: User;
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
  createdAt: string;
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
  updatedAt: string;
  isTemplate: boolean;
  type: EModuleType;
  tags: Tag[];
  versions: ModuleVersion[];
  accesses: ModuleAccess[];
  moduleBlocks: Block[];
  picture: Picture;

  // Constructeur vide
  constructor();

  // Premier constructeur avec les paramètres de base
  constructor(title: string, description: string, creator: User, createdAt: string, updatedAt: string, isTemplate: boolean, type: EModuleType);

  // Second constructeur avec les paramètres de base + picture
  constructor(title: string, description: string, creator: User, createdAt: string, updatedAt: string, isTemplate: boolean, type: EModuleType, picture: Picture);

  // Implémentation des constructeurs
  constructor(title?: string, description?: string, creator?: User, createdAt?: string, updatedAt?: string, isTemplate?: boolean, type?: EModuleType, picture?: Picture) {
    this.id = 0;
    this.title = title || '';
    this.description = description || '';
    this.creator = creator || new User('','');
    this.createdAt = createdAt || '';
    this.updatedAt = updatedAt || '';
    this.isTemplate = isTemplate || false;
    this.type = type || EModuleType.Scenario;
    this.tags = [];
    this.versions = [];
    this.accesses = [];
    this.moduleBlocks = [];
    this.picture = picture || new Picture();
  }
}

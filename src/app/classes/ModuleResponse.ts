import { EModuleType } from "../enum/ModuleType";
import { ModuleVersion } from "./ModuleVersion";
import { Tag } from "./Tag";
import { User } from "./User";

export class ModuleResponse {
  id: number;
  title: string;
  description: string;
  isTemplate: boolean;
  type: EModuleType;
  creator?: User;
  createdAt: string; // Format ISO: "yyyy-MM-dd HH:mm:ss"
  updatedAt: string; // Format ISO: "yyyy-MM-dd HH:mm:ss"
  versions: ModuleVersion[];
  tags: Tag[];

  constructor();
  constructor(
    id: number,
    title: string,
    description: string,
    type: EModuleType,
    creator: User,
    createdAt?: string,
    updatedAt?: string,
    versions?: ModuleVersion[],
    tags?: Tag[],
    isTemplate?: boolean
  );
  constructor(
    id?: number,
    title?: string,
    description?: string,
    type?: EModuleType,
    creator?: User,
    createdAt?: string,
    updatedAt?: string,
    versions?: ModuleVersion[],
    tags?: Tag[],
    isTemplate?: boolean
  ) {
    this.id = id || 0;
    this.title = title || '';
    this.description = description || '';
    this.type = type || EModuleType.Scenario;
    this.creator = creator;
    this.createdAt = createdAt || new Date().toString();
    this.updatedAt = updatedAt || new Date().toString();
    this.versions = versions || [];
    this.tags = tags || [];
    this.isTemplate = isTemplate || false;
  }
}
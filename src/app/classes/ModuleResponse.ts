import { ModuleVersion } from "./ModuleVersion";
import { Tag } from "./Tag";

export class ModuleResponse {
  id?: number;
  title: string;
  description: string;
  isTemplate: boolean;
  type: string;
  createdBy?: string;
  createdAt?: string; // Format ISO: "yyyy-MM-dd HH:mm:ss"
  updatedAt?: string; // Format ISO: "yyyy-MM-dd HH:mm:ss"
  versions?: ModuleVersion[];
  tags?: Tag[];

  constructor(
      title: string,
      description: string,
      isTemplate: boolean,
      type: string,
      createdBy?: string,
      createdAt?: string,
      updatedAt?: string,
      versions?: ModuleVersion[],
      tags?: Tag[],
      id?: number
  ) {
      this.id = id;
      this.title = title;
      this.description = description;
      this.isTemplate = isTemplate;
      this.type = type;
      this.createdBy = createdBy;
      this.createdAt = createdAt;
      this.updatedAt = updatedAt;
      this.versions = versions;
      this.tags = tags;
  }
}
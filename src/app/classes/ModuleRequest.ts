import { EModuleType } from "../enum/ModuleType";
import { ModuleAccess } from "./ModuleAccess";
import { ModuleVersion } from "./ModuleVersion";
import { Picture } from "./Picture";
import { User } from "./User";

export class ModuleRequest {
  title: string;
  description: string;
  isTemplate: boolean;
  type: EModuleType;
  creator: User;
  picture: Picture;
  versions: ModuleVersion[];
  accesses: ModuleAccess[];

  constructor(
      title: string,
      description: string,
      isTemplate: boolean,
      type: EModuleType,
      creator: User,
      picture: Picture,
      versions: ModuleVersion[],
      accesses: ModuleAccess[]
  ) {
      this.title = title;
      this.description = description;
      this.isTemplate = isTemplate;
      this.type = type;
      this.creator = creator;
      this.picture = picture;
      this.versions = versions;
      this.accesses = accesses;
  }
}

import { EModuleType } from "../enum/ModuleType";
import { User } from "./User";

export class ModuleRequest {
  title: string;
  description: string;
  isTemplate: boolean;
  type: EModuleType;
  creator: User;

  constructor(
      title: string,
      description: string,
      isTemplate: boolean,
      type: EModuleType,
      creator: User
  ) {
      this.title = title;
      this.description = description;
      this.isTemplate = isTemplate;
      this.type = type;
      this.creator = creator;
  }
}

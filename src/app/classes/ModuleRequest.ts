import { User } from "./User";

export class ModuleRequest {
  title: string;
  description: string;
  isTemplate: boolean;
  type: string;
  creatorId: User;

  constructor(
      title: string,
      description: string,
      isTemplate: boolean,
      type: string,
      creatorId: User
  ) {
      this.title = title;
      this.description = description;
      this.isTemplate = isTemplate;
      this.type = type;
      this.creatorId = creatorId;
  }
}

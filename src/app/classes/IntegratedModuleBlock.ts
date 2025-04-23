import { Block } from "./Block";
import { User } from "./User";

export class IntegratedModuleBlock extends Block {
  moduleId?: number;

  constructor(
      moduleVersionId: number,
      title: string,
      blockOrder: number,
      creator: User,
      moduleId?: number,
      id?: number
  ) {
      super(moduleVersionId, title, blockOrder, creator, id);
      this.moduleId = moduleId;
      this.type = 'integrated-module';
  }
}

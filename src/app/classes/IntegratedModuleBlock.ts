import { Block } from "./Block";

export class IntegratedModuleBlock extends Block {
  moduleId?: number;

  constructor(
      moduleVersionId: number,
      title: string,
      blockOrder: number,
      createdBy: string,
      moduleId?: number,
      id?: number
  ) {
      super(moduleVersionId, title, blockOrder, createdBy, id);
      this.moduleId = moduleId;
      this.type = 'integrated-module';
  }
}
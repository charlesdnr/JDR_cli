import { EBlockType } from "../enum/BlockType";
import { User } from "./User";

export abstract class Block {
  id?: number;
  moduleVersionId: number;
  title: string;
  blockOrder: number;
  creator: User;
  type: EBlockType;

  constructor(
      moduleVersionId: number,
      title: string,
      blockOrder: number,
      creator: User,
      id?: number
  ) {
      this.id = id;
      this.moduleVersionId = moduleVersionId;
      this.title = title;
      this.blockOrder = blockOrder;
      this.creator = creator;
      this.type = EBlockType.paragraph;
  }
}

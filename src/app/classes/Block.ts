import { User } from "./User";

export abstract class Block {
  id?: number;
  moduleVersionId: number;
  title: string;
  blockOrder: number;
  creator: User;
  type: string;

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
      this.type = "";
  }
}

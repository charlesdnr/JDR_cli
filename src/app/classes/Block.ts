export abstract class Block {
  id?: number;
  moduleVersionId: number;
  title: string;
  blockOrder: number;
  createdBy: string;
  type: string;

  constructor(
      moduleVersionId: number,
      title: string,
      blockOrder: number,
      createdBy: string,
      id?: number
  ) {
      this.id = id;
      this.moduleVersionId = moduleVersionId;
      this.title = title;
      this.blockOrder = blockOrder;
      this.createdBy = createdBy;

      this.type = "";
  }
}
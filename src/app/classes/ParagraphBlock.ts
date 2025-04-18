import { Block } from "./Block";

export class ParagraphBlock extends Block {
  paragraph?: string;
  style?: string;

  constructor(
      moduleVersionId: number,
      title: string,
      blockOrder: number,
      createdBy: string,
      paragraph?: string,
      style?: string,
      id?: number
  ) {
      super(moduleVersionId, title, blockOrder, createdBy, id);
      this.paragraph = paragraph;
      this.style = style;
      this.type = 'paragraph';
  }
}
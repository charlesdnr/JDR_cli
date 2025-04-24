import { EBlockType } from "../enum/BlockType";
import { Block } from "./Block";
import { User } from "./User";

export class ParagraphBlock extends Block {
  paragraph?: string;
  style?: string;

  constructor(
    moduleVersionId: number,
    title: string,
    blockOrder: number,
    creator: User,
    paragraph?: string,
    style?: string,
    id?: number
  ) {
    super(moduleVersionId, title, blockOrder, creator, id);
    this.paragraph = paragraph;
    this.style = style;
    this.type = EBlockType.paragraph;
  }
}

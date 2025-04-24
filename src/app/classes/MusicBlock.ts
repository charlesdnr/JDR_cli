import { EBlockType } from "../enum/BlockType";
import { Block } from "./Block";
import { User } from "./User";

export class MusicBlock extends Block {
  label?: string;
  src?: string;

  constructor(
    moduleVersionId: number,
    title: string,
    blockOrder: number,
    creator: User,
    label?: string,
    src?: string,
    id?: number
  ) {
    super(moduleVersionId, title, blockOrder, creator, id);
    this.label = label;
    this.src = src;
    this.type = EBlockType.music;
  }
}

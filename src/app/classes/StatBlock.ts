import { EBlockType } from "../enum/BlockType";
import { Block } from "./Block";
import { User } from "./User";

export class StatBlock extends Block {
  statRules?: string;
  statValues?: string;

  constructor(
    moduleVersionId: number,
    title: string,
    blockOrder: number,
    creator: User,
    statRules?: string,
    statValues?: string,
    id?: number
  ) {
    super(moduleVersionId, title, blockOrder, creator, id);
    this.statRules = statRules;
    this.statValues = statValues;
    this.type = EBlockType.stat;
  }
}
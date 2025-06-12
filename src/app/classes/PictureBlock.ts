import { EBlockType } from "../enum/BlockType";
import { Block } from "./Block";
import { Picture } from "./Picture";
import { User } from "./User";

export class PictureBlock extends Block {
  label: string;
  picture: Picture;

  constructor();
  constructor(moduleVersionId: number, title: string, blockOrder: number,creator: User, picture?: Picture, label?: string, id?: number);
  constructor(moduleVersionId?: number, title?: string, blockOrder?: number,creator?: User, picture?: Picture, label?: string, id?: number) {
    super(moduleVersionId ?? 0,title ?? '',blockOrder ?? 0, creator ?? new User('',''),id);
    this.label = label || "";
    this.picture = picture || new Picture();
    this.type = EBlockType.picture;
  }
}

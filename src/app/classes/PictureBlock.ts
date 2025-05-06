import { Block } from "./Block";
import { Picture } from "./Picture";
import { User } from "./User";

export class PictureBlock extends Block {
  label: string;
  picture: Picture;

  constructor();
  constructor(label: string, picture: Picture,moduleVersionId?: number, title?: string, blockOrder?: number, creator?: User, id?: number);
  constructor(label?: string, picture?: Picture,moduleVersionId?: number, title?: string, blockOrder?: number, creator?: User, id?: number) {
    super(moduleVersionId ?? 0,title ?? '',blockOrder ?? 0, creator ?? new User('',''),id);
    this.label = label || "";
    this.picture = picture || new Picture();
  }
}

import { Picture } from "../classes/Picture";
import { User } from "../classes/User";

export interface IBlockData {
  id?: number;
  moduleVersionId: number;
  title: string;
  blockOrder: number;
  creator: User;
  type: string;

  // Propriétés spécifiques à ParagraphBlock
  paragraph?: string;
  style?: string;

  // Propriétés spécifiques à IntegratedModuleBlock
  moduleId?: number;

  // Propriétés spécifiques à StatBlock
  statRules?: string;
  statValues?: string;

  // Propriétés spécifiques à MusicBlock et PictureBlock
  label?: string;
  src?: string;

  // Propriétés spécifiques à PictureBlock
  picture?: Picture;
}
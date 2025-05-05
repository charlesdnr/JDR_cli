import { Block } from "../classes/Block";
import { IntegratedModuleBlock } from "../classes/IntegratedModuleBlock";
import { MusicBlock } from "../classes/MusicBlock";
import { ParagraphBlock } from "../classes/ParagraphBlock";
import { StatBlock } from "../classes/StatBlock";
import { IBlockData } from "../interfaces/IBlockData";


export function createBlock(data: IBlockData): Block {
  switch (data.type) {
      case 'paragraph':
          return new ParagraphBlock(
              data.moduleVersionId,
              data.title,
              data.blockOrder,
              data.creator,
              data.paragraph,
              data.style,
              data.id
          );
      case 'module':
          return new IntegratedModuleBlock(
              data.moduleVersionId,
              data.title,
              data.blockOrder,
              data.creator,
              data.moduleId,
              data.id
          );
      case 'stat':
          return new StatBlock(
              data.moduleVersionId,
              data.title,
              data.blockOrder,
              data.creator,
              data.statRules,
              data.statValues,
              data.id
          );
      case 'music':
          return new MusicBlock(
              data.moduleVersionId,
              data.title,
              data.blockOrder,
              data.creator,
              data.label,
              data.src,
              data.id
          );
      default:
          throw new Error(`Type de bloc non pris en charge: ${data.type}`);
  }
}
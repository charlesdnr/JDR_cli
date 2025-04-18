import { Block } from "../classes/Block";
import { IntegratedModuleBlock } from "../classes/IntegratedModuleBlock";
import { ParagraphBlock } from "../classes/ParagraphBlock";
import { IBlockData } from "../interfaces/IBlockData";

export function createBlock(data: IBlockData): Block {
  switch (data.type) {
      case 'paragraph':
          return new ParagraphBlock(
              data.moduleVersionId,
              data.title,
              data.blockOrder,
              data.createdBy,
              data.paragraph,
              data.style,
              data.id
          );
      case 'integrated-module':
          return new IntegratedModuleBlock(
              data.moduleVersionId,
              data.title,
              data.blockOrder,
              data.createdBy,
              data.moduleId,
              data.id
          );
      default:
          throw new Error(`Type de bloc non pris en charge: ${data.type}`);
  }
}
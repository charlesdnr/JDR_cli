import { EBlockType } from './../../../enum/BlockType';
import { Component, ElementRef, input, output, viewChild } from '@angular/core';
import { StatBlockComponent } from '../stat-block/stat-block.component';
import { BlockItemComponent } from '../block-item/block-item.component';
import { MusicBlockComponent } from '../music-block/music-block.component';
import { ParagraphBlockComponent } from '../paragraph-block/paragraph-block.component';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { Block } from '../../../classes/Block';
import { ParagraphBlock } from '../../../classes/ParagraphBlock';
import { MusicBlock } from '../../../classes/MusicBlock';
import { StatBlock } from '../../../classes/StatBlock';

@Component({
  selector: 'app-block-list',
  imports: [
    DragDropModule,
    BlockItemComponent,
    ParagraphBlockComponent,
    MusicBlockComponent,
    StatBlockComponent,
  ],
  templateUrl: './block-list.component.html',
  styleUrl: './block-list.component.scss',
})
export class BlockListComponent {
  blocksContainerRef = viewChild<ElementRef<HTMLElement>>('blocksContainer');
  blocks = input.required<Block[]>();
  isDraggingIcon = input<boolean>(false);
  isOverDropZone = input<boolean>(false);
  draggedIconType = input<EBlockType | null>(null);
  insertPosition = input<number | null>(null);

  blockDropped = output<CdkDragDrop<Block[]>>();
  blockRemoved = output<number>();
  generateAIContent = output<{ blockId: number, blockType: string }>();

  EBlockType = EBlockType

  onDrop(event: CdkDragDrop<Block[]>): void {
    this.blockDropped.emit(event);
  }

  onRemoveBlock(blockId: number): void {
    this.blockRemoved.emit(blockId);
  }

  onGenerateAI(event: { blockId: number, blockType: string }): void {
    this.generateAIContent.emit(event);
  }

  getBlockPreview(type: EBlockType): string | undefined {
    switch (type) {
      case EBlockType.paragraph:
        return 'Paragraphe';
      case EBlockType.music:
        return 'Audio';
      case EBlockType.module:
        return 'Module';
      case EBlockType.stat:
        return 'Statistique';
      case EBlockType.picture:
        return 'Image';
      default:
        return undefined;
    }
  }

  isParagraphBlock(block: Block): boolean {
    return block.type === EBlockType.paragraph;
  }

  isMusicBlock(block: Block): boolean {
    return block.type === EBlockType.music;
  }

  isStatBlock(block: Block): boolean {
    return block.type === EBlockType.stat;
  }

  isModuleBlock(block: Block): boolean {
    return block.type === EBlockType.module;
  }

  asParagraphBlock(block: Block): ParagraphBlock {
    return block as ParagraphBlock;
  }

  asMusicBlock(block: Block): MusicBlock {
    return block as MusicBlock;
  }

  asStatBlock(block: Block): StatBlock {
    return block as StatBlock;
  }
}

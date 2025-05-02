import { Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { Block } from '../../../classes/Block';
import { EBlockType } from '../../../enum/BlockType';
import {
  DragDropModule
} from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-block-item',
  imports: [
    ButtonModule,
    TooltipModule,
    DragDropModule
  ],
  templateUrl: './block-item.component.html',
  styleUrl: './block-item.component.scss'
})
export class BlockItemComponent {
  block = input.required<Block>();
  enum = input.required<typeof EBlockType>();

  removeBlock = output<number>();
  generateAIContent = output<{ blockId: number, blockType: string }>();

  getIconByType(type: string): string {
    switch (type) {
      case EBlockType.paragraph:
        return 'pi pi-align-left';
      case EBlockType.music:
        return 'pi pi-volume-up';
      case EBlockType.module:
        return 'pi pi-book';
      case EBlockType.stat:
        return 'pi pi-chart-bar';
      case EBlockType.picture:
        return 'pi pi-image';
      default:
        return 'pi pi-question-circle';
    }
  }

  getBlockPreview(type: string): string | undefined {
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

  onRemoveBlock(blockId: number): void {
    this.removeBlock.emit(blockId);
  }

  onGenerateAI(blockId: number, blockType: string): void {
    this.generateAIContent.emit({ blockId, blockType });
  }
}

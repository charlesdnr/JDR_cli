import { EBlockType } from '../../../enum/BlockType';
import { Component, input, output } from '@angular/core';
import { Block } from '../../../classes/Block';

@Component({
  selector: 'app-block-types-toolbar',
  imports: [],
  templateUrl: './block-types-toolbar.component.html',
  styleUrl: './block-types-toolbar.component.scss',
})
export class BlockTypesToolbarComponent {
  availableBlocks = input.required<Block[]>();
  isDraggingIcon = input<boolean>(false);
  dragPosition = input<{ x: number; y: number }>({ x: 0, y: 0 });
  draggedIconType = input<EBlockType | null>(null);

  blockDragStarted = output<{ event: Event; blockType: EBlockType }>();

  EBlockType = EBlockType;

  getIconByType(type: EBlockType): string {
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

  startIconDrag(event: Event, blockType: EBlockType): void {
    this.blockDragStarted.emit({ event, blockType });
  }
}

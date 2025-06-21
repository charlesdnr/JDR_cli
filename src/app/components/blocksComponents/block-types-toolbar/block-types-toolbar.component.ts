import { EBlockType } from '../../../enum/BlockType';
import { Component, input, output, signal, computed } from '@angular/core';
import { Block } from '../../../classes/Block';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { BadgeModule } from 'primeng/badge';
import { RippleModule } from 'primeng/ripple';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

@Component({
  selector: 'app-block-types-toolbar',
  imports: [ButtonModule, TooltipModule, BadgeModule, RippleModule],
  templateUrl: './block-types-toolbar.component.html',
  styleUrl: './block-types-toolbar.component.scss',
  animations: [
    trigger('slideInLeft', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-30px)' }),
        animate('300ms cubic-bezier(0.35, 0, 0.25, 1)', 
               style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ]),
    trigger('staggerItems', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(20px) scale(0.8)' }),
          stagger('50ms', [
            animate('250ms cubic-bezier(0.35, 0, 0.25, 1)', 
                   style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
          ])
        ], { optional: true })
      ])
    ]),
    trigger('pulseHover', [
      transition('idle => hover', [
        animate('200ms ease-in-out', style({ transform: 'scale(1.05)' }))
      ]),
      transition('hover => idle', [
        animate('200ms ease-in-out', style({ transform: 'scale(1)' }))
      ])
    ])
  ]
})
export class BlockTypesToolbarComponent {
  availableBlocks = input.required<Block[]>();
  isDraggingIcon = input<boolean>(false);
  dragPosition = input<{ x: number; y: number }>({ x: 0, y: 0 });
  draggedIconType = input<EBlockType | null>(null);
  readonly = input<boolean>(false);

  blockDragStarted = output<{ event: Event; blockType: EBlockType }>();

  EBlockType = EBlockType;
  
  // Signals pour gérer l'état
  hoveredBlock = signal<EBlockType | null>(null);
  recentlyUsed = signal<EBlockType[]>([]);
  
  // Computed pour organiser les blocks
  organizedBlocks = computed(() => {
    const blocks = this.availableBlocks();
    const recent = this.recentlyUsed();
    
    return {
      recent: blocks.filter(block => recent.includes(block.type)),
      popular: blocks.filter(block => [
        EBlockType.paragraph, 
        EBlockType.picture, 
        EBlockType.stat
      ].includes(block.type)),
      all: blocks
    };
  });
  
  // Helper pour vérifier si un block est récent
  isBlockRecent(blockType: EBlockType): boolean {
    return this.recentlyUsed().includes(blockType);
  }


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

  getBlockInfo(type: EBlockType): { name: string; description: string; category: string } {
    switch (type) {
      case EBlockType.paragraph:
        return {
          name: 'Paragraphe',
          description: 'Texte riche avec formatage',
          category: 'Contenu'
        };
      case EBlockType.music:
        return {
          name: 'Audio',
          description: 'Fichier audio ou musique',
          category: 'Média'
        };
      case EBlockType.module:
        return {
          name: 'Module',
          description: 'Module intégré',
          category: 'Avancé'
        };
      case EBlockType.stat:
        return {
          name: 'Statistique',
          description: 'Tableau de statistiques',
          category: 'Données'
        };
      case EBlockType.picture:
        return {
          name: 'Image',
          description: 'Photo ou illustration',
          category: 'Média'
        };
      default:
        return {
          name: 'Inconnu',
          description: 'Type non reconnu',
          category: 'Autre'
        };
    }
  }
  
  getBlockPreview(type: EBlockType): string {
    return this.getBlockInfo(type).name;
  }
  
  getCategoryColor(type: EBlockType): 'info' | 'success' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    const category = this.getBlockInfo(type).category;
    switch (category) {
      case 'Contenu': return 'info';
      case 'Média': return 'success';
      case 'Données': return 'info';
      case 'Avancé': return 'warn';
      default: return 'secondary';
    }
  }
  
  onBlockHover(type: EBlockType | null): void {
    this.hoveredBlock.set(type);
  }
  
  addToRecentlyUsed(type: EBlockType): void {
    const current = this.recentlyUsed();
    const updated = [type, ...current.filter(t => t !== type)].slice(0, 3);
    this.recentlyUsed.set(updated);
  }

  startIconDrag(event: Event, blockType: EBlockType): void {
    if (!this.readonly()) {
      this.addToRecentlyUsed(blockType);
      this.blockDragStarted.emit({ event, blockType });
    }
  }
  
  onKeyDown(event: KeyboardEvent, blockType: EBlockType): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.startIconDrag(event, blockType);
    }
  }
}

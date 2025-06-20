import {
  Component,
  ElementRef,
  HostListener,
  inject,
  input,
  model,
  NgZone,
  signal,
  viewChild,
} from '@angular/core';
import { StatBlockComponent } from '../stat-block/stat-block.component';
import { BlockItemComponent } from '../block-item/block-item.component';
import { MusicBlockComponent } from '../music-block/music-block.component';
import { ParagraphBlockComponent } from '../paragraph-block/paragraph-block.component';
import { PictureBlockComponent } from '../picture-block/picture-block.component';
import {
  DragDropModule,
  CdkDragDrop,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { Block } from '../../../classes/Block';
import { ParagraphBlock } from '../../../classes/ParagraphBlock';
import { MusicBlock } from '../../../classes/MusicBlock';
import { StatBlock } from '../../../classes/StatBlock';
import { PictureBlock } from '../../../classes/PictureBlock';
import { IntegratedModuleBlock } from '../../../classes/IntegratedModuleBlock';
import { SkeletonModule } from 'primeng/skeleton';
import { ModuleService } from '../../../services/module.service';
import { UserHttpService } from '../../../services/https/user-http.service';
import { DialogService } from 'primeng/dynamicdialog';
import { AiConfigComponent } from '../../ai-config/ai-config.component';
import { EBlockType } from '../../../enum/BlockType';
import { NotificationService } from '../../../services/Notification.service';
import { ModuleUpdateDTO } from '../../../interfaces/ModuleUpdateDTO';
import { ModuleBlockComponent } from '../moduleblock/moduleblock.component';
import { AnimationOptions, LottieComponent } from 'ngx-lottie';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-block-list',
  imports: [
    DragDropModule,
    BlockItemComponent,
    ParagraphBlockComponent,
    MusicBlockComponent,
    StatBlockComponent,
    PictureBlockComponent,
    ModuleBlockComponent,
    SkeletonModule,
    LottieComponent,
    TranslateModule,
  ],
  templateUrl: './block-list.component.html',
  styleUrl: './block-list.component.scss',
})
export class BlockListComponent {
  private moduleService = inject(ModuleService);
  private userService = inject(UserHttpService);
  private dialogService = inject(DialogService);
  private notificationService = inject(NotificationService);
  private zone = inject(NgZone);

  blocksContainerRef = viewChild<ElementRef<HTMLElement>>('blocksContainer');
  blocks = input.required<Block[]>();
  isReadOnly = input<boolean>(false);
  showEmptyState = input<boolean>(false);
  lottieOptions = input<AnimationOptions | null>(null);
  isDraggingIcon = model<boolean>(false);
  isOverDropZone = model<boolean>(false);
  draggedIconType = model<EBlockType | null>(null);
  insertPosition = model<number | null>(null);
  activeIconElement = model<HTMLElement | null>(null);
  dragPosition = model<{ x: number; y: number }>();

  loadingBlock = this.moduleService.loadingModule.asReadonly();

  EBlockType = EBlockType;

  otherUserCursors = this.notificationService.userCursors;
  activeUsers = signal<Set<number>>(new Set());
  updateThrottleTimeout = 0;

  // Nouvelle méthode - Gérer directement le drop
  onDrop(event: CdkDragDrop<Block[]>): void {
    if (this.isReadOnly()) return;

    const version = this.moduleService.currentModuleVersion();
    if (!version) {
      console.error('Version actuelle non définie');
      return;
    }

    try {
      const currentBlocks = [...this.blocks()];
      moveItemInArray(currentBlocks, event.previousIndex, event.currentIndex);

      currentBlocks.forEach((block, index) => (block.blockOrder = index));

      this.moduleService.currentModuleVersion.update((ver) => {
        if (!ver) return undefined;
        return { ...ver, blocks: [...currentBlocks] };
      });

      this.moduleService.currentModule.update((mod) => {
        if (!mod) return null;

        const versions = [...mod.versions];
        const versionIndex = versions.findIndex((v) => v.id === version.id);

        if (versionIndex !== -1) {
          versions[versionIndex] = {
            ...versions[versionIndex],
            blocks: [...currentBlocks],
          };
        } else if (versions.length > 0) {
          versions[0] = { ...versions[0], blocks: [...currentBlocks] };
        }

        return { ...mod, versions };
      });
    } catch (error) {
      console.error('Erreur dans onDrop:', error);
    }
  }

  @HostListener('document:mouseup', ['$event']) onMouseUp = (
    event: MouseEvent
  ) => {
    if (!this.isDraggingIcon()) return;
    if (this.isOverDropZone()) {
      const insertPosition = this.calculateInsertPosition(event);

      // Appeler la méthode addBlock du BlockListComponent
      this.addBlock(
        this.draggedIconType() || EBlockType.paragraph,
        insertPosition
      );
    }
    this.endIconDrag();
  };

  // Méthode manquante - Envoyer une mise à jour de contenu
  sendContentUpdate(blockId: number, element: HTMLElement): void {
    const currentUser = this.userService.currentJdrUser();
    const module = this.moduleService.currentModule();
    if (!currentUser || !module || module.id === 0) return;

    // Détecter le type d'opération (insert, delete, update)
    const content = element.textContent || '';
    const block = this.blocks().find((b) => b.id === blockId);

    if (!block) return;

    // Déterminer le type d'opération en comparant avec le contenu précédent
    let operation: 'insert' | 'delete' | 'update' = 'update';

    if (block instanceof ParagraphBlock) {
      if (block.paragraph && content.length > block.paragraph.length) {
        operation = 'insert';
      } else if (block.paragraph && content.length < block.paragraph.length) {
        operation = 'delete';
      }
    }

    const update: ModuleUpdateDTO = {
      userId: currentUser.id,
      username: currentUser.username || 'Utilisateur',
      blockId: blockId,
      operation: operation,
      content: content,
      startPosition: 0, // Ces positions devront être calculées avec précision
      timestamp: Date.now(),
    };

    this.notificationService.sendModuleUpdate(module.id, update);
  }

  calculateInsertPosition(event: MouseEvent): number {
    const currentBlocks = this.blocks(); // Utilise currentVersion signal
    if (!currentBlocks) return 0;
    if (!this.blocksContainerRef()) return currentBlocks.length;

    const blockElements = Array.from(
      this.blocksContainerRef()?.nativeElement.querySelectorAll(
        '.block-container:not(.cdk-drag-preview):not(.cdk-drag-placeholder)'
      ) || []
    );

    if (blockElements.length === 0) return 0;

    // Logique existante pour calculer la position
    for (let i = 0; i < blockElements.length; i++) {
      const blockRect = blockElements[i].getBoundingClientRect();
      if (event.clientY < blockRect.top) return i;
      if (event.clientY >= blockRect.top && event.clientY <= blockRect.bottom) {
        const blockMiddle = blockRect.top + blockRect.height / 2;
        return event.clientY < blockMiddle ? i : i + 1;
      }
      if (i === blockElements.length - 1 && event.clientY > blockRect.bottom) {
        return blockElements.length;
      }
      if (i < blockElements.length - 1) {
        const nextBlockRect = blockElements[i + 1].getBoundingClientRect();
        if (
          event.clientY > blockRect.bottom &&
          event.clientY < nextBlockRect.top
        ) {
          return i + 1;
        }
      }
    }

    let closestIndex = currentBlocks.length;
    let smallestDistance = Infinity;
    blockElements.forEach((element, index) => {
      const blockRect = element.getBoundingClientRect();
      const elementMidY = blockRect.top + blockRect.height / 2;
      const distance = Math.abs(event.clientY - elementMidY);
      if (distance < smallestDistance) {
        smallestDistance = distance;
        closestIndex = event.clientY < elementMidY ? index : index + 1;
      }
    });
    return closestIndex;
  }

  onRemoveBlock(blockId: number): void {
    if (this.isReadOnly()) return;
    const version = this.moduleService.currentModuleVersion();
    if (!version || !version.blocks) return;

    const currentBlocks = version.blocks.filter(
      (block) => block.id !== blockId
    );
    currentBlocks.forEach((block, idx) => (block.blockOrder = idx));

    this.moduleService.currentModuleVersion.update((ver) => {
      if (!ver) return undefined;
      return { ...ver, blocks: [...currentBlocks] };
    });

    this.moduleService.currentModule.update((mod) => {
      if (!mod) return null;

      const versions = [...mod.versions];
      const versionIndex = versions.findIndex((v) => v.id === version.id);

      if (versionIndex !== -1) {
        versions[versionIndex] = {
          ...versions[versionIndex],
          blocks: [...currentBlocks],
        };
      } else if (versions.length > 0) {
        versions[0] = { ...versions[0], blocks: [...currentBlocks] };
      }

      return { ...mod, versions };
    });
  }

  // Nouvelle méthode - Gérer directement la génération IA
  onGenerateAI(event: { blockId: number; blockType: string }): void {
    this.dialogService
      .open(AiConfigComponent, {
        showHeader: false,
        width: '60rem',
        modal: true,
        inputValues: {
          type: event.blockType,
        },
      })
      .onClose.subscribe((response: string) => {
        if (!response || response.length === 0) return;

        this.processAIResponse(event.blockId, event.blockType, response);
      });
  }

  // Nouvelle méthode - Traiter la réponse IA
  private processAIResponse(
    blockId: number,
    blockType: string,
    response: string
  ): void {
    const version = this.moduleService.currentModuleVersion();
    if (!version || !version.blocks) return;

    if (blockType === EBlockType.paragraph) {
      const blocks = [...version.blocks];
      const index = blocks.findIndex((block) => block.id === blockId);

      if (index !== -1) {
        const block = blocks[index] as ParagraphBlock;
        block.paragraph = response;

        this.moduleService.currentModule.update((mod) => {
          if (!mod) return null;

          const versionIndex = mod.versions.findIndex(
            (v) => v.id === version.id
          );
          if (versionIndex !== -1) {
            mod.versions[versionIndex].blocks = blocks;
          } else if (mod.versions.length > 0) {
            mod.versions[0].blocks = blocks;
          }

          return { ...mod };
        });
      }
    }
    // TODO ajouter block statistique
  }

  // Méthodes d'aide pour gérer les différents types de blocs
  isParagraphBlock(block: Block): boolean {
    return block?.type === EBlockType.paragraph;
  }

  isMusicBlock(block: Block): boolean {
    return block?.type === EBlockType.music;
  }

  isStatBlock(block: Block): boolean {
    return block?.type === EBlockType.stat;
  }

  isModuleBlock(block: Block): boolean {
    return block?.type === EBlockType.module;
  }

  isPictureBlock(block: Block): boolean {
    return block?.type === EBlockType.picture;
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

  asModuleBlock(block: Block): IntegratedModuleBlock {
    return block as IntegratedModuleBlock;
  }

  asPictureBlock(block: Block): PictureBlock {
    return block as PictureBlock;
  }

  addBlock(type: EBlockType, position?: number): void {
    if (this.isReadOnly()) return;
    const user = this.userService.currentJdrUser();
    const version = this.moduleService.currentModuleVersion();

    if (!user || !version) {
      console.error(
        "Impossible d'ajouter un bloc: utilisateur ou version non disponible."
      );
      return;
    }

    let newBlock: Block | null = null;
    const currentVersionId = version.id ?? 0;
    const currentBlocks = [...(version.blocks || [])]; // Copie explicite
    const blockOrder = position !== undefined ? position : currentBlocks.length;
    const blockTitle = this.getBlockPreview(type) ?? 'Nouveau Bloc';

    switch (type) {
      case EBlockType.paragraph:
        newBlock = new ParagraphBlock(
          currentVersionId,
          blockTitle,
          blockOrder,
          user
        );
        break;
      case EBlockType.module:
        newBlock = new IntegratedModuleBlock(
          currentVersionId,
          blockTitle,
          blockOrder,
          user
        );
        break;
      case EBlockType.music:
        newBlock = new MusicBlock(
          currentVersionId,
          blockTitle,
          blockOrder,
          user
        );
        break;
      case EBlockType.stat:
        newBlock = new StatBlock(
          currentVersionId,
          blockTitle,
          blockOrder,
          user
        );
        break;
      case EBlockType.picture:
        newBlock = new PictureBlock(
          currentVersionId,
          blockTitle,
          blockOrder,
          user
        );
        break;
      default:
        console.warn(`Type de bloc ${type} non géré.`);
        return;
    }

    newBlock.id = Date.now() + Math.random();

    const newBlocks = [...currentBlocks];
    newBlocks.splice(blockOrder, 0, newBlock);
    newBlocks.forEach((block, index) => (block.blockOrder = index));

    this.moduleService.currentModuleVersion.update((ver) => {
      if (!ver) return undefined;
      return { ...ver, blocks: [...newBlocks] };
    });

    this.moduleService.currentModule.update((mod) => {
      if (!mod) return null;

      const versions = [...mod.versions];
      const versionIndex = versions.findIndex((v) => v.id === version.id);

      if (versionIndex !== -1) {
        // Créer une nouvelle référence pour la version modifiée
        versions[versionIndex] = {
          ...versions[versionIndex],
          blocks: [...newBlocks],
        };
      } else if (versions.length > 0) {
        versions[0] = { ...versions[0], blocks: [...newBlocks] };
      }

      return { ...mod, versions };
    });
  }

  @HostListener('document:mousemove', ['$event'])
  onDocumentMouseMove(event: MouseEvent): void {
    if (!this.isDraggingIcon()) {
      return;
    }

    // Logique existante pour le glisser-déposer d'icônes
    this.dragPosition.set({ x: event.clientX, y: event.clientY });
    this.checkIfOverDropZone(event);

    if (this.isOverDropZone()) {
      this.insertPosition.set(this.calculateInsertPosition(event));
    } else {
      this.insertPosition.set(null);
    }
  }

  endIconDrag() {
    if (!this.isDraggingIcon()) return;
    this.isDraggingIcon.set(false);
    this.draggedIconType.set(null);
    this.isOverDropZone.set(false);
    this.insertPosition.set(null);

    if (this.activeIconElement()) {
      this.activeIconElement()!.classList.remove('active-drag');
      this.activeIconElement.set(null);
    }
  }

  checkIfOverDropZone(event: MouseEvent) {
    if (!(this.blocksContainerRef() != undefined)) {
      this.isOverDropZone.set(false);
      return;
    }

    const rect =
      this.blocksContainerRef()!.nativeElement.getBoundingClientRect();
    const isOver =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;

    if (isOver !== this.isOverDropZone()) {
      this.isOverDropZone.set(isOver);
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
}

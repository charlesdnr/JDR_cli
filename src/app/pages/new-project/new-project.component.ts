import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TabsModule } from 'primeng/tabs';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { MessageService } from 'primeng/api';
import { ProjectParametersComponent } from '../../components/project-parameters/project-parameters.component';
import { Block } from '../../classes/Block';
import { ParagraphBlock } from '../../classes/ParagraphBlock';
import { ModuleVersion } from '../../classes/ModuleVersion';
import { ModuleResponse } from '../../classes/ModuleResponse';
import { MusicBlock } from '../../classes/MusicBlock';
import { IntegratedModuleBlock } from '../../classes/IntegratedModuleBlock';
import { GameSystem } from '../../classes/GameSystem';
import { StatBlock } from '../../classes/StatBlock';
import { EBlockType } from '../../enum/BlockType';
import { UserHttpService } from '../../services/https/user-http.service';
import { BlockHttpService } from '../../services/https/block-http.service';
import { ModuleHttpService } from '../../services/https/module-http.service';
import { ModuleVersionHttpService } from '../../services/https/module-version-http.service';
import { GameSystemHttpService } from '../../services/https/game-system-http.service';
import { AiConfigComponent } from '../../components/ai-config/ai-config.component';
import { BlockTypesToolbarComponent } from '../../components/blocksComponents/block-types-toolbar/block-types-toolbar.component';
import { BlockListComponent } from '../../components/blocksComponents/block-list/block-list.component';
import { TranslateModule } from '@ngx-translate/core';
import {
  DialogService,
  DynamicDialogModule,
  DynamicDialogRef,
} from 'primeng/dynamicdialog';

@Component({
  selector: 'app-new-project',
  standalone: true,
  imports: [
    CommonModule,
    TabsModule,
    DragDropModule,
    ProjectParametersComponent,
    BlockTypesToolbarComponent,
    BlockListComponent,
    TranslateModule,
    DynamicDialogModule,
  ],
  templateUrl: './new-project.component.html',
  styleUrl: './new-project.component.scss',
})
export class NewProjectComponent implements OnInit {
  private userService = inject(UserHttpService);
  private blockHttpService = inject(BlockHttpService);
  private moduleHttpService = inject(ModuleHttpService);
  private moduleVersionHttpService = inject(ModuleVersionHttpService);
  private gameSystemHttpService = inject(GameSystemHttpService);
  public dialogService = inject(DialogService);
  private messageService = inject(MessageService);

  ref: DynamicDialogRef | undefined;

  blockListComponent = viewChild(BlockListComponent);
  dropZoneElement = computed(() =>
    this.blockListComponent()?.blocksContainerRef()
  );

  // Enums
  enumBlockType = EBlockType;

  // States
  blocks = signal<Block[]>([]);
  availableBlocks: Block[] = [];
  currentModule = signal<ModuleResponse>(new ModuleResponse());
  currentModuleVersion = signal<ModuleVersion>(new ModuleVersion());
  currentUser = computed(() => this.userService.currentJdrUser());
  currentGameSystem = signal<GameSystem | undefined>(undefined);
  gameSystems = signal<GameSystem[]>([]);

  isDraggingIcon = signal(false);
  draggedIconType: EBlockType | null = null;
  activeIconElement: HTMLElement | null = null;
  dragPosition = { x: 0, y: 0 };
  isOverDropZone = signal(false);
  insertPosition = signal<number | null>(null);

  initialSetupDone = signal(false);

  constructor() {
    // Logique d'initialisation selon les utilisateurs disponibles...
  }

  async ngOnInit() {
    try {
      const systems = await this.gameSystemHttpService.getAllGameSystems();
      this.gameSystems.set(systems);
      const defaultGameSystem = systems.length > 0 ? systems[0] : undefined;
      this.currentGameSystem.set(defaultGameSystem);
    } catch (error) {
      console.error('Error loading game systems:', error);
    }

    // Initialisation des blocs disponibles si l'utilisateur est connecté
    this.initializeAvailableBlocks();
  }

  // Méthode d'initialisation des blocs disponibles
  private initializeAvailableBlocks() {
    const user = this.currentUser();
    if (user) {
      const tempModuleVersionId = 0;
      this.availableBlocks = [
        new ParagraphBlock(tempModuleVersionId, 'Preview Paragraphe', 0, user),
        new MusicBlock(tempModuleVersionId, 'Preview Musique', 1, user),
        new StatBlock(tempModuleVersionId, 'Preview Stats', 2, user),
        new IntegratedModuleBlock(
          tempModuleVersionId,
          'Preview Module Intégré',
          3,
          user
        ),
      ];
      this.addBlock(EBlockType.paragraph);
      this.initialSetupDone.set(true);
    }
  }

  // Méthodes de gestion du drag & drop
  startIconDrag(event: { event: Event; blockType: EBlockType }) {
    if (this.isDraggingIcon()) return;

    let clientX = 0,
      clientY = 0;
    if (event.event instanceof MouseEvent) {
      clientX = event.event.clientX;
      clientY = event.event.clientY;
    } else if (event.event.target) {
      const rect = (event.event.target as HTMLElement).getBoundingClientRect();
      clientX = rect.left + rect.width / 2;
      clientY = rect.top + rect.height / 2;
    }

    this.isDraggingIcon.set(true);
    this.draggedIconType = event.blockType;
    this.dragPosition = { x: clientX, y: clientY };

    if (event.event.target) {
      this.activeIconElement = (event.event.target as HTMLElement).closest(
        '.icon-item'
      );
      this.activeIconElement?.classList.add('active-drag');
    }
  }

  @HostListener('document:mousemove', ['$event']) onMouseMove = (
    event: MouseEvent
  ) => {
    if (!this.isDraggingIcon()) return;
    this.dragPosition = { x: event.clientX, y: event.clientY };
    this.checkIfOverDropZone(event);

    // Mettre à jour la position d'insertion en temps réel
    if (this.isOverDropZone()) {
      this.insertPosition.set(this.calculateInsertPosition(event));
    } else {
      this.insertPosition.set(null);
    }
  };

  @HostListener('document:mouseup', ['$event']) onMouseUp = (
    event: MouseEvent
  ) => {
    if (!this.isDraggingIcon()) return;
    if (this.isOverDropZone()) {
      const insertPosition = this.calculateInsertPosition(event);
      this.addBlock(
        this.draggedIconType || EBlockType.paragraph,
        insertPosition
      );
    }
    this.endIconDrag();
  };

  endIconDrag() {
    if (!this.isDraggingIcon()) return;
    this.isDraggingIcon.set(false);
    this.draggedIconType = null;
    this.isOverDropZone.set(false);
    this.insertPosition.set(null);

    if (this.activeIconElement) {
      this.activeIconElement.classList.remove('active-drag');
      this.activeIconElement = null;
    }
  }

  checkIfOverDropZone(event: MouseEvent) {
    if (!(this.dropZoneElement() != undefined)) {
      this.isOverDropZone.set(false);
      return;
    }

    const rect = this.dropZoneElement()!.nativeElement.getBoundingClientRect();
    const isOver =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;

    if (isOver !== this.isOverDropZone()) {
      this.isOverDropZone.set(isOver);
    }
  }

  calculateInsertPosition(event: MouseEvent): number {
    const currentBlocks = this.blocks();
    if (!this.dropZoneElement()) return currentBlocks.length;

    const blockElements = Array.from(
      this.dropZoneElement()?.nativeElement.querySelectorAll(
        '.block-container:not(.cdk-drag-preview):not(.cdk-drag-placeholder)'
      ) || []
    );

    if (blockElements.length === 0) return 0;

    // Pour chaque bloc, déterminer si le curseur est au-dessus ou en-dessous
    for (let i = 0; i < blockElements.length; i++) {
      const blockRect = blockElements[i].getBoundingClientRect();

      // Si la souris est au-dessus de ce bloc
      if (event.clientY < blockRect.top) return i;

      // Si la souris est dans ce bloc
      if (event.clientY >= blockRect.top && event.clientY <= blockRect.bottom) {
        const blockMiddle = blockRect.top + blockRect.height / 2;
        return event.clientY < blockMiddle ? i : i + 1;
      }

      // Si c'est le dernier bloc et que la souris est en-dessous
      if (i === blockElements.length - 1 && event.clientY > blockRect.bottom) {
        return blockElements.length;
      }

      // Si la souris est entre ce bloc et le suivant
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

    // Fallback : trouver le bloc le plus proche
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

  // Méthodes de gestion des blocs
  addBlock(type: EBlockType, position?: number) {
    const user = this.currentUser();
    if (!user) {
      console.error('Cannot add block: user not available.');
      return;
    }

    let newBlock: Block | null = null;
    const currentVersionId = this.currentModuleVersion()?.id ?? 0;
    const currentBlockArray = this.blocks();
    const blockOrder =
      position !== undefined ? position : currentBlockArray.length;
    const blockPreviewTitle = this.getBlockPreview(type) ?? 'Nouveau Bloc';

    switch (type) {
      case EBlockType.paragraph:
        newBlock = new ParagraphBlock(
          currentVersionId,
          blockPreviewTitle,
          blockOrder,
          user
        );
        break;
      case EBlockType.module:
        newBlock = new IntegratedModuleBlock(
          currentVersionId,
          blockPreviewTitle,
          blockOrder,
          user
        );
        break;
      case EBlockType.music:
        newBlock = new MusicBlock(
          currentVersionId,
          blockPreviewTitle,
          blockOrder,
          user
        );
        break;
      case EBlockType.stat:
        newBlock = new StatBlock(
          currentVersionId,
          blockPreviewTitle,
          blockOrder,
          user
        );
        break;
      default:
        console.warn(`Block type ${type} not handled in addBlock`);
        return;
    }

    newBlock.id = this.blocks().length + 1;

    const newBlocks = [...currentBlockArray];

    if (position !== undefined) {
      newBlocks.splice(position, 0, newBlock);
    } else {
      newBlocks.push(newBlock);
    }

    newBlocks.forEach((block, index) => {
      block.blockOrder = index;
    });

    this.blocks.set(newBlocks);
  }

  removeBlock(blockId: number) {
    const currentBlocks = this.blocks();
    const newBlocks = currentBlocks.filter((block) => block.id !== blockId);

    newBlocks.forEach((block, idx) => {
      block.blockOrder = idx;
    });

    this.blocks.set(newBlocks);
  }

  onDrop(event: CdkDragDrop<Block[]>) {
    const currentBlocks = [...this.blocks()];
    moveItemInArray(currentBlocks, event.previousIndex, event.currentIndex);

    currentBlocks.forEach((block, index) => {
      block.blockOrder = index;
    });

    this.blocks.set(currentBlocks);
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

  onGameSystemChange(system: GameSystem) {
    this.currentGameSystem.set(system);
    this.currentModuleVersion.update((version) => {
      version.gameSystemId = system?.id ?? version.gameSystemId ?? undefined;
      return { ...version };
    });
  }

  // Méthodes pour sauvegarder le projet
  async save() {
    // Logique de sauvegarde du projet
  }

  // Méthode pour générer avec l'IA
  generateAIContent(data: { blockId: number; blockType: string }) {
    this.dialogService
      .open(AiConfigComponent, {
        header: "Générer avec l'IA",
        width: '60rem',
        modal: true,
        inputValues: {
          type: data.blockType,
        },
      })
      .onClose.subscribe((response: string) => {
        if (!response || response.length === 0) return;

        // Traitement de la réponse selon le type de bloc
        this.processAIResponse(data.blockId, data.blockType, response);
      });
  }

  processAIResponse(blockId: number, blockType: string, response: string) {
    // Logique de traitement de la réponse IA selon le type de bloc
  }

  generateCompleteModule() {
    this.ref = this.dialogService.open(AiConfigComponent, {
      header: "Générer un module complet avec l'IA",
      width: '70rem',
      modal: true,
      inputValues: {
        type: 'complete-module',
      },
    });

    this.ref.onClose.subscribe((response: string) => {
      if (!response || response.length === 0) return;

      try {
        const moduleData = JSON.parse(response);
        console.log('Module data received:', moduleData);

        // Update the current module with metadata
        this.currentModule.update((module) => ({
          ...module,
          title: moduleData.title || module.title,
          description: moduleData.description || module.description,
        }));

        // Update game system if provided
        if (moduleData.gameSystemId) {
          const gameSystemId = parseInt(moduleData.gameSystemId);
          const gameSystem = this.gameSystems().find(
            (gs) => gs.id === gameSystemId
          );
          if (gameSystem) {
            this.currentGameSystem.set(gameSystem);

            // Update the moduleVersion
            this.currentModuleVersion.update((version) => ({
              ...version,
              gameSystemId: gameSystemId,
            }));
          }
        }

        // Clear existing blocks and create new ones from the response
        if (moduleData.blocks && Array.isArray(moduleData.blocks)) {
          // Create a new array for blocks
          const newBlocks: Block[] = [];

          // Process each block from the response
          moduleData.blocks.forEach((block: any, index: number) => {
            if (this.currentUser()) {
              let newBlock: Block | null = null;

              switch (block.type) {
                case 'paragraph':
                  newBlock = new ParagraphBlock(
                    this.currentModuleVersion().id || 0,
                    block.title || 'Paragraphe généré',
                    index,
                    this.currentUser()!,
                    block.content || '',
                    block.style || 'narrative'
                  );
                  break;

                case 'music':
                  newBlock = new MusicBlock(
                    this.currentModuleVersion().id || 0,
                    block.title || 'Musique générée',
                    index,
                    this.currentUser()!,
                    block.label || block.title || 'Ambiance musicale',
                    block.src || ''
                  );
                  break;

                case 'stat':
                  newBlock = new StatBlock(
                    this.currentModuleVersion().id || 0,
                    block.title || 'Statistiques générées',
                    index,
                    this.currentUser()!,
                    block.statRules || '',
                    block.statValues || block.content || ''
                  );
                  break;
              }

              if (newBlock) {
                // Give each block a temporary ID
                newBlock.id = index + 1;
                newBlocks.push(newBlock);
              }
            }
          });

          // Update blocks signal with the new array
          this.blocks.set(newBlocks);
        }

        // Notify user of successful generation
        this.messageService.add({
          severity: 'success',
          summary: 'Génération réussie',
          detail: 'Le module a été généré avec succès!',
        });
      } catch (e) {
        console.error('Erreur lors du traitement de la réponse:', e);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: "Impossible de traiter la réponse de l'IA.",
        });
      }
    });
  }
}

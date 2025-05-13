import { Component, effect, ElementRef, HostListener, inject, input, model, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { StatBlockComponent } from '../stat-block/stat-block.component';
import { BlockItemComponent } from '../block-item/block-item.component';
import { MusicBlockComponent } from '../music-block/music-block.component';
import { ParagraphBlockComponent } from '../paragraph-block/paragraph-block.component';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Block } from '../../../classes/Block';
import { ParagraphBlock } from '../../../classes/ParagraphBlock';
import { MusicBlock } from '../../../classes/MusicBlock';
import { StatBlock } from '../../../classes/StatBlock';
import { SkeletonModule } from 'primeng/skeleton';
import { ModuleService } from '../../../services/module.service';
import { UserHttpService } from '../../../services/https/user-http.service';
import { DialogService } from 'primeng/dynamicdialog';
import { AiConfigComponent } from '../../ai-config/ai-config.component';
import { EBlockType } from '../../../enum/BlockType';
import { IntegratedModuleBlock } from '../../../classes/IntegratedModuleBlock';
import { NotificationService } from '../../../services/Notification.service';
import { StompSubscription } from '@stomp/stompjs';
import { ModuleUpdateDTO } from '../../../interfaces/ModuleUpdateDTO';
import { CursorPosition } from '../../../interfaces/CursorPosition';

@Component({
  selector: 'app-block-list',
  imports: [
    DragDropModule,
    BlockItemComponent,
    ParagraphBlockComponent,
    MusicBlockComponent,
    StatBlockComponent,
    SkeletonModule
  ],
  templateUrl: './block-list.component.html',
  styleUrl: './block-list.component.scss',
})
export class BlockListComponent implements OnDestroy {
  private moduleService = inject(ModuleService);
  private userService = inject(UserHttpService);
  private dialogService = inject(DialogService);
  private notificationService = inject(NotificationService);

  blocksContainerRef = viewChild<ElementRef<HTMLElement>>('blocksContainer');
  blocks = input.required<Block[]>();
  isReadOnly = input<boolean>(false);
  isDraggingIcon = model<boolean>(false);
  isOverDropZone = model<boolean>(false);
  draggedIconType = model<EBlockType | null>(null);
  insertPosition = model<number | null>(null);
  activeIconElement = model<HTMLElement | null>(null);
  dragPosition = model<{ x: number, y: number }>();
  loadingBlock = this.moduleService.loadingModule.asReadonly();

  EBlockType = EBlockType;

  otherUserCursors = this.notificationService.userCursors;
  activeUsers = signal<Set<number>>(new Set());
  cursorUpdateInterval: any;
  updateThrottleTimeout: any;

  private cursorSubscription: StompSubscription | undefined;
  private updateSubscription: StompSubscription | undefined;

  constructor() {
    effect(() => {
      const module = this.moduleService.currentModule();
      if (!module || module.id === 0 || this.isReadOnly()) return;

      // Établir les connections WebSocket si nécessaire
      if (!this.notificationService.isConnected()) {
        this.notificationService.connect().then(() => {
          this.setupCollaborativeFunctions(module.id);
        });
      } else {
        this.setupCollaborativeFunctions(module.id);
      }
    })
  }

  setupCollaborativeFunctions(moduleId: number): void {
    // S'abonner aux curseurs des autres utilisateurs
    this.cursorSubscription = this.notificationService.subscribeToModuleCursors(moduleId);

    // S'abonner aux mises à jour du contenu
    this.updateSubscription = this.notificationService.subscribeToModuleUpdates(
      moduleId,
      (update) => this.handleModuleUpdate(update)
    );

    // Configurer l'envoi périodique de la position du curseur
    this.cursorUpdateInterval = setInterval(() => {
      this.sendCursorPosition();
    }, 500); // Envoyer toutes les 500ms

    // Ajouter des écouteurs d'évènements pour détecter les mouvements et les clics
    this.setupBlockEventListeners();
  }

  setupBlockEventListeners(): void {
    const container = this.blocksContainerRef()?.nativeElement;
    if (!container) return;

    // Écouter les événements sur les blocs (mouseup, click, keyup)
    container.addEventListener('mouseup', this.onBlockInteraction);
    container.addEventListener('click', this.onBlockInteraction);
    container.addEventListener('keyup', this.onBlockInteraction);

    // Écouter les changements de contenu pour les envoyer aux autres
    container.addEventListener('input', this.onBlockContentChange);
  }

  // Gestionnaire d'interactions
  onBlockInteraction = (): void => {
    if (this.isReadOnly()) return;
    this.sendCursorPosition();
  };

  // Gestionnaire de changements de contenu
  onBlockContentChange = (event: Event): void => {
    if (this.isReadOnly()) return;

    // Annuler tout délai précédent
    if (this.updateThrottleTimeout) {
      clearTimeout(this.updateThrottleTimeout);
    }

    // Configurer un délai avant d'envoyer la mise à jour pour limiter le nombre de messages
    this.updateThrottleTimeout = setTimeout(() => {
      const target = event.target as HTMLElement;
      const blockId = this.getBlockIdFromElement(target);

      if (!blockId) return;

      this.sendContentUpdate(blockId, target);
    }, 300); // Délai de 300ms pour réduire la fréquence des mises à jour
  };

  // Envoyer la position du curseur
  sendCursorPosition(): void {
    if (this.isReadOnly()) return;

    const currentUser = this.userService.currentJdrUser();
    const module = this.moduleService.currentModule();
    if (!currentUser || !module || module.id === 0) return;

    // Obtenir la position actuelle du curseur dans le document
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const blockElement = this.getBlockElementFromSelection(range);
    console.log(blockElement)

    if (!blockElement) return;

    const blockId = this.getBlockIdFromElement(blockElement);
    const rect = range.getBoundingClientRect();

    const cursorPosition: CursorPosition = {
      userId: currentUser.id,
      username: currentUser.username || 'Utilisateur',
      blockId: blockId || 0,
      position: {
        x: rect.left,
        y: rect.top
      },
      selectionStart: this.getTextPosition(range.startContainer, range.startOffset),
      selectionEnd: this.getTextPosition(range.endContainer, range.endOffset),
      userColor: this.getUserColor(currentUser.id),
      timestamp: Date.now()
    };

    this.notificationService.sendCursorPosition(module.id, cursorPosition);
  };

  // Envoyer une mise à jour de contenu
  sendContentUpdate(blockId: number, element: HTMLElement): void {
    const currentUser = this.userService.currentJdrUser();
    const module = this.moduleService.currentModule();
    if (!currentUser || !module || module.id === 0) return;

    // Détecter le type d'opération (insert, delete, update)
    // Cette détection devrait idéalement se baser sur les événements DOM et l'historique
    const content = element.textContent || '';
    const block = this.blocks().find(b => b.id === blockId);

    if (!block) return;

    // Ici on compare simplement avec le contenu précédent connu
    // Dans un cas réel, on utiliserait une méthode plus sophistiquée
    // comme un algorithme de diff ou OT/CRDT
    let operation: 'insert' | 'delete' | 'update' = 'update';

    // Exemple simple: si le nouveau contenu est plus long, c'est un ajout
    // Si plus court, c'est une suppression
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
      timestamp: Date.now()
    };

    this.notificationService.sendModuleUpdate(module.id, update);
  };

  // Gestion des mises à jour reçues
  handleModuleUpdate(update: ModuleUpdateDTO): void {
    // Ignorer nos propres mises à jour
    const currentUser = this.userService.currentJdrUser();
    if (currentUser && update.userId === currentUser.id) return;

    // Trouver le bloc concerné
    const blockIndex = this.blocks().findIndex(b => b.id === update.blockId);
    if (blockIndex === -1) return;

    const block = this.blocks()[blockIndex];

    // Appliquer la mise à jour selon le type d'opération
    if (block instanceof ParagraphBlock) {
      switch (update.operation) {
        case 'insert':
          // Insérer du contenu
          this.updateBlockContent(blockIndex, update.content);
          break;
        case 'delete':
          // Supprimer du contenu
          this.updateBlockContent(blockIndex, update.content);
          break;
        case 'update':
          // Remplacer tout le contenu
          this.updateBlockContent(blockIndex, update.content);
          break;
      }
    }

    // Ajouter l'utilisateur à la liste des utilisateurs actifs
    this.activeUsers.update(users => {
      const newUsers = new Set(users);
      newUsers.add(update.userId);
      return newUsers;
    });
  };

  // Méthode utilitaire pour mettre à jour un bloc
  updateBlockContent(blockIndex: number, content: string): void {
    const block = this.blocks()[blockIndex];

    if (block instanceof ParagraphBlock) {
      block.paragraph = content;
    } else if (block instanceof StatBlock) {
      // Mettre à jour selon le type de bloc
    }

    // Forcer la mise à jour du signal
    this.moduleService.currentModuleVersion.update(version => {
      if (!version) return undefined;

      const updatedBlocks = [...version.blocks];
      updatedBlocks[blockIndex] = block;

      return { ...version, blocks: updatedBlocks };
    });
  };

  // Méthodes utilitaires
  getBlockIdFromElement(element: HTMLElement): number | null {
    // Remonter dans le DOM pour trouver l'ID de bloc
    const blockElement = element.closest('.block-container');
    if (!blockElement) return null;

    const blockId = blockElement.getAttribute('data-block-id');
    return blockId ? parseInt(blockId, 10) : null;
  }

  getBlockElementFromSelection(range: Range): HTMLElement | null {
    let current = range.commonAncestorContainer;

    while (current && (current as HTMLElement).className !== 'block-container') {
      if (current.parentElement) {
        current = current.parentElement;
      } else {
        return null;
      }
    }

    return current as HTMLElement;
  }

  getTextPosition(node: Node, offset: number): number {
    // Calculer la position du texte - cette méthode est simplifiée
    // Dans un cas réel, il faudrait tenir compte des éléments HTML, etc.
    return offset;
  }

  getUserColor(userId: number): string {
    // Générer une couleur unique basée sur l'ID utilisateur
    const hue = (userId * 137) % 360; // Formule pour distribuer les couleurs
    return `hsl(${hue}, 70%, 50%)`;
  }

  // Nettoyage lors de la destruction du composant
  ngOnDestroy(): void {
    // Nettoyer les écouteurs d'événements
    const container = this.blocksContainerRef()?.nativeElement;
    if (container) {
      container.removeEventListener('mouseup', this.onBlockInteraction);
      container.removeEventListener('click', this.onBlockInteraction);
      container.removeEventListener('keyup', this.onBlockInteraction);
      container.removeEventListener('input', this.onBlockContentChange);
    }

    // Arrêter l'envoi périodique de la position du curseur
    if (this.cursorUpdateInterval) {
      clearInterval(this.cursorUpdateInterval);
    }

    // Se désabonner des websockets
    if (this.cursorSubscription) {
      this.cursorSubscription.unsubscribe();
    }

    if (this.updateSubscription) {
      this.updateSubscription.unsubscribe();
    }
  }

  // Nouvelle méthode - Gérer directement le drop
  onDrop(event: CdkDragDrop<Block[]>): void {
    if (this.isReadOnly()) return;
    console.log("BlockListComponent.onDrop appelé", event);

    const version = this.moduleService.currentModuleVersion();
    if (!version) {
      console.error("Version actuelle non définie");
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
          versions[versionIndex] = { ...versions[versionIndex], blocks: [...currentBlocks] };
        } else if (versions.length > 0) {
          versions[0] = { ...versions[0], blocks: [...currentBlocks] };
        }

        return { ...mod, versions };
      });
    } catch (error) {
      console.error("Erreur dans onDrop:", error);
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

    const currentBlocks = version.blocks.filter(block => block.id !== blockId);
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
        versions[versionIndex] = { ...versions[versionIndex], blocks: [...currentBlocks] };
      } else if (versions.length > 0) {
        versions[0] = { ...versions[0], blocks: [...currentBlocks] };
      }

      return { ...mod, versions };
    });
  }

  // Nouvelle méthode - Gérer directement la génération IA
  onGenerateAI(event: { blockId: number, blockType: string }): void {
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
  private processAIResponse(blockId: number, blockType: string, response: string): void {
    const version = this.moduleService.currentModuleVersion();
    if (!version || !version.blocks) return;

    if (blockType === EBlockType.paragraph) {
      const blocks = [...version.blocks];
      const index = blocks.findIndex(block => block.id === blockId);

      if (index !== -1) {
        const block = blocks[index] as ParagraphBlock;
        block.paragraph = response;

        this.moduleService.currentModule.update((mod) => {
          if (!mod) return null;

          const versionIndex = mod.versions.findIndex((v) => v.id === version.id);
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

  asParagraphBlock(block: Block): ParagraphBlock {
    return block as ParagraphBlock;
  }

  asMusicBlock(block: Block): MusicBlock {
    return block as MusicBlock;
  }

  asStatBlock(block: Block): StatBlock {
    return block as StatBlock;
  }

  addBlock(type: EBlockType, position?: number): void {
    if (this.isReadOnly()) return;
    const user = this.userService.currentJdrUser();
    const version = this.moduleService.currentModuleVersion();
    console.log(version)

    if (!user || !version) {
      console.error("Impossible d'ajouter un bloc: utilisateur ou version non disponible.");
      return;
    }

    let newBlock: Block | null = null;
    const currentVersionId = version.id ?? 0;
    const currentBlocks = [...(version.blocks || [])]; // Copie explicite
    const blockOrder = position !== undefined ? position : currentBlocks.length;
    const blockTitle = this.getBlockPreview(type) ?? 'Nouveau Bloc';

    switch (type) {
      case EBlockType.paragraph:
        newBlock = new ParagraphBlock(currentVersionId, blockTitle, blockOrder, user);
        break;
      case EBlockType.module:
        newBlock = new IntegratedModuleBlock(currentVersionId, blockTitle, blockOrder, user);
        break;
      case EBlockType.music:
        newBlock = new MusicBlock(currentVersionId, blockTitle, blockOrder, user);
        break;
      case EBlockType.stat:
        newBlock = new StatBlock(currentVersionId, blockTitle, blockOrder, user);
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
        versions[versionIndex] = { ...versions[versionIndex], blocks: [...newBlocks] };
      } else if (versions.length > 0) {
        versions[0] = { ...versions[0], blocks: [...newBlocks] };
      }

      return { ...mod, versions };
    });
  }


  @HostListener('document:mousemove', ['$event']) onMouseMove = (
    event: MouseEvent
  ) => {
    if (!this.isDraggingIcon()) return;
    this.dragPosition.set({ x: event.clientX, y: event.clientY });
    this.checkIfOverDropZone(event);

    if (this.isOverDropZone()) {
      this.insertPosition.set(this.calculateInsertPosition(event));
    } else {
      this.insertPosition.set(null);
    }
  };

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

    const rect = this.blocksContainerRef()!.nativeElement.getBoundingClientRect();
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

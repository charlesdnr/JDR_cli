import { Component, effect, ElementRef, HostListener, inject, input, model, NgZone, OnDestroy, signal, viewChild } from '@angular/core';
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
  private zone = inject(NgZone);

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

  private cursorPosition = signal<{ x: number, y: number } | null>(null);
  private lastSentPosition = signal<string>(''); // Pour éviter d'envoyer des positions identiques
  private mouseInContainer = signal<boolean>(false);

  private documentMouseTracking = signal<boolean>(false);
  private scrollPosition = signal<{ x: number, y: number }>({ x: 0, y: 0 });
  private pageCoords = signal<{ x: number, y: number } | null>(null);

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

    effect(() => {
      const scrollHandler = () => {
        this.scrollPosition.set({
          x: window.scrollX,
          y: window.scrollY
        });
        // Forcer une mise à jour de la position du curseur lorsque la page défile
        if (this.pageCoords()) {
          this.updateCursorFromPageCoords();
        }
      };

      window.addEventListener('scroll', scrollHandler, { passive: true });

      return () => {
        window.removeEventListener('scroll', scrollHandler);
      };
    });

    effect(() => {
      const coords = this.pageCoords();
      if (coords) {
        this.updateCursorFromPageCoords();
      }
    });

    effect(() => {
      console.log(this.otherUserCursors())
    })

    effect(() => {
      const position = this.cursorPosition();
      const cursorPositionStr = position ? `${position.x},${position.y}` : '';

      // Éviter d'envoyer des positions identiques
      if (position && cursorPositionStr !== this.lastSentPosition()) {
        this.lastSentPosition.set(cursorPositionStr);
        this.sendCursorPositionData(position);
      }
    });
  }

  private updateCursorFromPageCoords(): void {
    const coords = this.pageCoords();
    if (!coords || this.isReadOnly()) return;

    // Calculer la position réelle par rapport à la fenêtre (ajustée avec le défilement)
    const adjustedPosition = {
      x: coords.x,
      y: coords.y
    };

    if (adjustedPosition.x !== 0 && adjustedPosition.y !== 0) {
      this.cursorPosition.set(adjustedPosition);
    }

    // Également essayer de trouver un bloc à cette position
    this.tryFindBlockAtPosition(coords);
  }

  // Nouvelle méthode pour essayer de trouver un bloc à une position donnée
  private tryFindBlockAtPosition(coords: { x: number, y: number }): void {
    if (!this.blocksContainerRef()) return;

    const container = this.blocksContainerRef()!.nativeElement;
    const blockElements = Array.from(container.querySelectorAll('.block-container'));

    // Vérifier si la position est à l'intérieur d'un bloc
    for (const element of blockElements) {
      const rect = element.getBoundingClientRect();
      if (
        coords.x >= rect.left &&
        coords.x <= rect.right &&
        coords.y >= rect.top &&
        coords.y <= rect.bottom
      ) {
        // Si on trouve un bloc, mettre à jour l'ID de bloc dans le signal
        const blockId = element.getAttribute('data-block-id');
        if (blockId) {
          // Utiliser ces infos pour la prochaine mise à jour de position
          console.log(`Curseur dans le bloc ${blockId}`);
          break;
        }
      }
    }
  }

  setupCollaborativeFunctions(moduleId: number): void {
    // S'abonner aux curseurs des autres utilisateurs
    this.cursorSubscription = this.notificationService.subscribeToModuleCursors(moduleId);

    // S'abonner aux mises à jour du contenu
    this.updateSubscription = this.notificationService.subscribeToModuleUpdates(
      moduleId,
      (update) => this.handleModuleUpdate(update)
    );

    // Configurer l'envoi périodique de la position du curseur (moins fréquent)
    this.cursorUpdateInterval = setInterval(() => {
      if (this.mouseInContainer()) {
        this.updateCursorPosition();
      }
    }, 500);

    // Activer le suivi de la souris au niveau du document entier
    this.documentMouseTracking.set(true);

    // Ajouter un gestionnaire pour suivre le mouvement de la souris sur tout le document
    this.zone.runOutsideAngular(() => {
      document.addEventListener('mousemove', this.handleDocumentMouseMove);
    });
  }

  private handleDocumentMouseMove = (e: MouseEvent): void => {
    if (!this.documentMouseTracking() || this.isReadOnly()) return;

    // Mettre à jour les coordonnées de la page
    this.pageCoords.set({ x: e.clientX, y: e.clientY });

    // Conversion de type pour e.target
    const target = e.target as Node;

    // Utiliser zone.run pour que les changements déclenchent la détection de changements
    if (this.blocksContainerRef()?.nativeElement.contains(target)) {
      this.zone.run(() => {
        this.mouseInContainer.set(true);
      });
    }
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

  // Nouvelle méthode pour gérer les interactions avec le document
  onDocumentInteraction(event: Event): void {
    if (this.isReadOnly()) return;

    // Mise à jour de la position du curseur
    this.updateCursorPosition();
  }

  // Nouvelle méthode pour suivre le mouvement de la souris
  onMouseMove(event: MouseEvent): void {
    if (this.isReadOnly()) return;

    this.mouseInContainer.set(true);

    // Ne pas mettre à jour à chaque mouvement pour éviter trop d'envois
    // Utiliser un throttle pour limiter les mises à jour
    if (this.updateThrottleTimeout) {
      clearTimeout(this.updateThrottleTimeout);
    }

    this.updateThrottleTimeout = setTimeout(() => {
      this.updateCursorPosition();
    }, 100); // 100ms de throttle
  }

  // Nouvelle méthode pour gérer les changements de contenu
  onContentChange(event: Event): void {
    if (this.isReadOnly()) return;

    // Annuler tout délai précédent
    if (this.updateThrottleTimeout) {
      clearTimeout(this.updateThrottleTimeout);
    }

    // Throttle pour limiter les mises à jour
    this.updateThrottleTimeout = setTimeout(() => {
      const target = event.target as HTMLElement;
      const blockId = this.getBlockIdFromElement(target);

      if (!blockId) return;

      // Mise à jour du curseur après modification du contenu
      this.updateCursorPosition();
      this.sendContentUpdate(blockId, target);
    }, 300);
  }

  // Méthode améliorée pour le calcul de la position du curseur
  updateCursorPosition(): void {
    if (this.isReadOnly()) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      // Si pas de sélection, utiliser les coordonnées de la page
      return;
    }

    const range = selection.getRangeAt(0);
    const blockElement = this.getBlockElementFromSelection(range);

    if (!blockElement) return;

    // Calculer la position RÉELLE du curseur par rapport à la fenêtre
    const rects = range.getClientRects();

    // S'il n'y a pas de rectangle, on utilise la position de l'élément parent
    if (!rects || rects.length === 0) {
      const blockRect = blockElement.getBoundingClientRect();
      this.cursorPosition.set({
        x: blockRect.left,
        y: blockRect.top
      });
      return;
    }

    // Utiliser le premier rectangle du range (position du curseur)
    const rect = rects[0];

    // Positions ajustées par rapport à la fenêtre
    const adjustedPosition = {
      x: rect.left,
      y: rect.top
    };

    this.cursorPosition.set(adjustedPosition);
  }

  // Méthode modifiée pour envoyer les données du curseur
  sendCursorPositionData(position: { x: number, y: number }): void {
    const currentUser = this.userService.currentJdrUser();
    const module = this.moduleService.currentModule();
    if (!currentUser || !module || module.id === 0) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const blockElement = this.getBlockElementFromSelection(range);

    if (!blockElement) return;

    const blockId = this.getBlockIdFromElement(blockElement);

    const cursorPosition: CursorPosition = {
      userId: currentUser.id,
      username: currentUser.username || 'Utilisateur',
      blockId: blockId || 0,
      position: position,
      selectionStart: this.getTextPosition(range.startContainer, range.startOffset),
      selectionEnd: this.getTextPosition(range.endContainer, range.endOffset),
      userColor: this.getUserColor(currentUser.id),
      timestamp: Date.now()
    };

    this.notificationService.sendCursorPosition(module.id, cursorPosition);
  }

  // Amélioration du calcul de la position du texte
  getTextPosition(node: Node, offset: number): number {
    if (node.nodeType !== Node.TEXT_NODE) {
      return offset;
    }

    // Pour les nœuds texte, calculer la position absolue en incluant les nœuds précédents
    let position = offset;

    // Trouver le conteneur éditable parent
    let currentNode: Node | null = node;
    let editableParent: HTMLElement | null = null;

    while (currentNode && !editableParent) {
      if (currentNode instanceof HTMLElement &&
        (currentNode.isContentEditable ||
          currentNode.tagName === 'TEXTAREA' ||
          currentNode.tagName === 'INPUT')) {
        editableParent = currentNode;
      }
      currentNode = currentNode.parentNode;
    }

    if (!editableParent) return offset;

    // Calculer la position en parcourant tous les nœuds précédents
    const treeWalker = document.createTreeWalker(
      editableParent,
      NodeFilter.SHOW_TEXT,
      null
    );

    let currentTextNode = treeWalker.nextNode();
    while (currentTextNode && currentTextNode !== node) {
      position += (currentTextNode.textContent || '').length;
      currentTextNode = treeWalker.nextNode();
    }

    return position;
  }

  // Gestion du départ de la souris du conteneur
  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.mouseInContainer.set(false);
  }

  // Nettoyage lors de la destruction du composant
  ngOnDestroy(): void {
    // Arrêter l'envoi périodique de la position du curseur
    if (this.cursorUpdateInterval) {
      clearInterval(this.cursorUpdateInterval);
    }

    if (this.updateThrottleTimeout) {
      clearTimeout(this.updateThrottleTimeout);
    }

    // Se désabonner des websockets
    if (this.cursorSubscription) {
      this.cursorSubscription.unsubscribe();
    }

    if (this.updateSubscription) {
      this.updateSubscription.unsubscribe();
    }
  }

  getBlockIdFromElement(element: HTMLElement): number | null {
    // Remonter dans le DOM pour trouver l'ID de bloc
    const blockElement = element.closest('.block-container');
    if (!blockElement) return null;

    const blockId = blockElement.getAttribute('data-block-id');
    return blockId ? parseInt(blockId, 10) : null;
  }

  // Méthode améliorée pour trouver l'élément de bloc à partir d'une sélection
  getBlockElementFromSelection(range: Range): HTMLElement | null {
    let current: Node | null = range.commonAncestorContainer;

    // Si le nœud actuel est un nœud texte, obtenir son élément parent
    if (current.nodeType === Node.TEXT_NODE) {
      current = current.parentElement;
    }

    // Remonter dans l'arbre DOM pour trouver l'élément avec la classe 'block-container'
    while (current) {
      if (current instanceof HTMLElement) {
        if (current.classList.contains('block-container')) {
          return current;
        }

        // Vérifier également si c'est à l'intérieur d'un composant de bloc
        const blockContainer = current.closest('.block-container');
        if (blockContainer) {
          return blockContainer as HTMLElement;
        }
      }

      // Passer à l'élément parent
      current = current.parentElement;
    }

    return null;
  }


  getUserColor(userId: number): string {
    // Générer une couleur unique basée sur l'ID utilisateur
    const hue = (userId * 137) % 360; // Formule pour distribuer les couleurs
    return `hsl(${hue}, 70%, 50%)`;
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

  // Méthode manquante - Envoyer une mise à jour de contenu
  sendContentUpdate(blockId: number, element: HTMLElement): void {
    const currentUser = this.userService.currentJdrUser();
    const module = this.moduleService.currentModule();
    if (!currentUser || !module || module.id === 0) return;

    // Détecter le type d'opération (insert, delete, update)
    const content = element.textContent || '';
    const block = this.blocks().find(b => b.id === blockId);

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
      timestamp: Date.now()
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


  @HostListener('document:mousemove', ['$event'])
  onDocumentMouseMove(event: MouseEvent): void {
    if (!this.isDraggingIcon()) {
      // Logique de suivi du curseur
      if (!this.isReadOnly()) {
        this.pageCoords.set({ x: event.clientX, y: event.clientY });

        // Vérifier si nous sommes dans le conteneur - conversion de type pour event.target
        const target = event.target as Node;
        if (this.blocksContainerRef()?.nativeElement.contains(target)) {
          this.mouseInContainer.set(true);

          // Ajouter un délai pour éviter trop de mises à jour
          if (this.updateThrottleTimeout) {
            clearTimeout(this.updateThrottleTimeout);
          }

          this.updateThrottleTimeout = setTimeout(() => {
            this.updateCursorPosition();
          }, 50); // throttle à 50ms
        }
      }
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

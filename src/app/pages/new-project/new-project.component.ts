import { Component, OnInit, OnDestroy, HostListener, NgZone } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { Toolbar } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { SplitButton } from 'primeng/splitbutton';
import { InputTextModule } from 'primeng/inputtext';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { TextareaModule } from 'primeng/textarea';
import { FileUploadEvent, FileUploadModule } from 'primeng/fileupload';
import {
  DragDropModule,
  CdkDragDrop,
  moveItemInArray,
} from '@angular/cdk/drag-drop';

interface BlockElement {
  type: string;
  content: Record<string, unknown>;
  id: string;
}

interface BlockType {
  type: string;
  icon: string;
}

interface Position {
  x: number;
  y: number;
}

@Component({
  selector: 'app-new-project',
  imports: [Toolbar, ButtonModule, SplitButton, InputTextModule, IconField, InputIcon, DragDropModule, TextareaModule, FileUploadModule],
  templateUrl: './new-project.component.html',
  styleUrl: './new-project.component.scss'
})
export class NewProjectComponent implements OnInit, OnDestroy {
  items: MenuItem[] | undefined;
  uploadedFiles: any[] = [];
  blocks: BlockElement[] = [];
  availableBlocks: BlockType[] = [
    { type: 'Texte', icon: 'pi pi-comment' },
    { type: 'Audio', icon: 'pi pi-microphone' },
    { type: 'Image', icon: 'pi pi-image' },
    { type: 'Statistique', icon: 'pi pi-chart-bar' }
  ];

  // Propriétés pour le système de drag personnalisé
  isDraggingIcon = false;
  draggedIconType: string | null = null;
  activeIconElement: HTMLElement | null = null;
  dragPosition: Position = { x: 0, y: 0 };
  isOverDropZone = false;
  dropZoneElement: HTMLElement | null = null;

  // Pour garder la position de la souris dans le conteneur
  dragInsertPosition = 0;

  // We'll use this to generate unique IDs for blocks
  private blockIdCounter = 0;

  constructor(private ngZone: NgZone) { }

  ngOnInit() {
    this.items = [
      {
        label: 'Update',
        icon: 'pi pi-refresh'
      },
      {
        label: 'Delete',
        icon: 'pi pi-times'
      }
    ];

    // Add a default text block when component initializes
    this.addBlock('Texte');

    // Trouver l'élément de drop zone
    setTimeout(() => {
      this.dropZoneElement = document.getElementById('blocksList');
    });
  }

  ngOnDestroy() {
    // Nettoyer les écouteurs d'événements si nécessaire
    this.endIconDrag();
  }

  // Démarrer le drag d'une icône
  startIconDrag(event: Event, iconType: string) {
    event.preventDefault();

    // Si c'est un événement clavier, simuler la position de la souris
    let clientX = 0, clientY = 0;
    if (event instanceof MouseEvent) {
      clientX = event.clientX;
      clientY = event.clientY;
    } else if (event.target) {
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      clientX = rect.left + rect.width / 2;
      clientY = rect.top + rect.height / 2;
    }

    this.isDraggingIcon = true;
    this.draggedIconType = iconType;
    this.dragPosition = { x: clientX, y: clientY };

    // Marquer l'icône comme active
    if (event.target) {
      this.activeIconElement = (event.target as HTMLElement).closest('.icon-item');
      this.activeIconElement?.classList.add('active-drag');
    }

    // Ajouter les écouteurs d'événements pour le mousemove et mouseup
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  // Gérer le mouvement de la souris pendant le drag
  @HostListener('document:mousemove', ['$event'])
  onMouseMove = (event: MouseEvent) => {
    if (!this.isDraggingIcon) return;

    // Mettre à jour la position du preview
    this.ngZone.run(() => {
      this.dragPosition = { x: event.clientX, y: event.clientY };

      // Vérifier si on est au-dessus de la zone de drop
      this.checkIfOverDropZone(event);
    });
  }

  // Terminer le drag quand on relâche la souris
  @HostListener('document:mouseup', ['$event'])
  onMouseUp = (event: MouseEvent) => {
    if (!this.isDraggingIcon) return;

    this.ngZone.run(() => {
      if (this.isOverDropZone) {
        // Déterminer la position d'insertion basée sur la position Y de la souris
        const insertPosition = this.calculateInsertPosition(event);

        // Utiliser le type draggedIconType actuel, ou 'Texte' par défaut
        this.addBlockAtPosition(this.draggedIconType || 'Texte', insertPosition);
      }

      this.endIconDrag();
    });
  }

  // Terminer le drag et nettoyer
  endIconDrag() {
    this.isDraggingIcon = false;
    this.draggedIconType = null;
    this.isOverDropZone = false;

    // Supprimer la classe active de l'icône
    if (this.activeIconElement) {
      this.activeIconElement.classList.remove('active-drag');
      this.activeIconElement = null;
    }

    // Supprimer les écouteurs d'événements
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  }

  // Vérifier si le curseur est au-dessus de la zone de drop
  checkIfOverDropZone(event: MouseEvent) {
    if (!this.dropZoneElement) return;

    const rect = this.dropZoneElement.getBoundingClientRect();
    this.isOverDropZone = (
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    );
  }

  // Calculer la position d'insertion basée sur la position Y de la souris
  calculateInsertPosition(event: MouseEvent): number {
    if (!this.dropZoneElement) return this.blocks.length;

    const blockElements = Array.from(this.dropZoneElement.querySelectorAll('.block-container'));
    if (blockElements.length === 0) return 0;

    // Trouver le bloc au-dessus duquel on est en train de passer
    for (let i = 0; i < blockElements.length; i++) {
      const blockRect = blockElements[i].getBoundingClientRect();
      const blockMiddle = blockRect.top + blockRect.height / 2;

      if (event.clientY < blockMiddle) {
        return i;
      }
    }

    // Si on est en dessous de tous les blocs, ajouter à la fin
    return this.blocks.length;
  }

  // Ajouter un bloc à une position spécifique
  addBlockAtPosition(type: string, position: number) {
    const newBlock: BlockElement = {
      type,
      content: {},
      id: `block-${this.blockIdCounter++}`
    };

    this.blocks.splice(position, 0, newBlock);
  }

  // Obtenir la classe d'icône pour le preview de drag
  getDraggedIconClass(): string {
    if (!this.draggedIconType) return '';

    const block = this.availableBlocks.find(b => b.type === this.draggedIconType);
    return block ? block.icon : '';
  }

  geticonByType(type: string) {
    switch (type) {
      case 'Texte': return 'pi pi-comment';
      case 'Audio': return 'pi pi-microphone';
      case 'Image': return 'pi pi-image';
      case 'Statistique': return 'pi pi-chart-bar';
      default: return 'Block';
    }
  }

  // Add a new block at the end of the list
  addBlock(type: string) {
    const newBlock: BlockElement = {
      type,
      content: {},
      id: `block-${this.blockIdCounter++}`
    };

    this.blocks.push(newBlock);
  }

  // Remove a block by ID
  removeBlock(blockId: string) {
    const index = this.blocks.findIndex(block => block.id === blockId);
    if (index !== -1) {
      this.blocks.splice(index, 1);
    }
  }

  // Handle drops (for reordering blocks)
  onDrop(event: CdkDragDrop<any>) {
    moveItemInArray(this.blocks, event.previousIndex, event.currentIndex);
  }

  // Get block preview based on type
  getBlockPreview(type: string): string {
    switch (type) {
      case 'Texte': return 'Text Block';
      case 'Audio': return 'Audio Block';
      case 'Image': return 'Image Block';
      case 'Statistique': return 'Statistique Block';
      default: return 'Block';
    }
  }

  onUpload(event: FileUploadEvent) {
    for (const file of event.files) {
      this.uploadedFiles.push(file);
    }
  }
}

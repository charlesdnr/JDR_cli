import { Component, OnInit, OnDestroy, HostListener, NgZone, computed, inject } from '@angular/core';
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
import { Block } from '../../classes/Block';
import { ParagraphBlock } from '../../classes/ParagraphBlock';
import { ModuleVersion } from '../../classes/ModuleVersion';
import { ModuleResponse } from '../../classes/ModuleResponse';
import { UserHttpService } from '../../services/https/user-http.service';
import { MusicBlock } from '../../classes/MusicBlock';
import { StatBlock } from '../../classes/StatBlock';
import { IntegratedModuleBlock } from '../../classes/IntegratedModuleBlock';
import { EBlockType } from '../../enum/BlockType';
import { BlockHttpService } from '../../services/https/block-http.service';
import { ModuleHttpService } from '../../services/https/module-http.service';
import { ModuleRequest } from '../../classes/ModuleRequest';
import { EModuleType } from '../../enum/ModuleType';
import { ModuleVersionHttpService } from '../../services/https/module-version-http.service';

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
  private userService = inject(UserHttpService);
  private blockHttpService = inject(BlockHttpService);
  private moduleHttpService = inject(ModuleHttpService);
  private moduleVersionHttpService = inject(ModuleVersionHttpService);

  enumBlockType = EBlockType

  items: MenuItem[] | undefined;
  uploadedFiles: File[] = [];
  blocks: Block[] = [];
  availableBlocks: Block[] = [];
  currentModule: ModuleResponse = new ModuleResponse();
  currentModuleVersion: ModuleVersion = new ModuleVersion();
  currentUser = computed(() => this.userService.currentJdrUser())

  // { type: 'Texte', icon: 'pi pi-comment' },
  //   { type: 'Audio', icon: 'pi pi-microphone' },
  //   { type: 'Image', icon: 'pi pi-image' },
  //   { type: 'Statistique', icon: 'pi pi-chart-bar' }

  // Propriétés pour le système de drag personnalisé
  isDraggingIcon = false;
  draggedIconType: EBlockType | null = null;
  activeIconElement: HTMLElement | null = null;
  dragPosition: Position = { x: 0, y: 0 };
  isOverDropZone = false;
  dropZoneElement: HTMLElement | null = null;

  // Pour garder la position de la souris dans le conteneur
  dragInsertPosition = 0;

  // We'll use this to generate unique IDs for blocks
  private blockIdCounter = 0;

  constructor(private ngZone: NgZone) { }

  async ngOnInit() {
    const user = this.currentUser();
    if(user){
      this.currentModule = await this.moduleHttpService.createModule(
        new ModuleRequest('New Module Version','Description', false, EModuleType.Scenario, user)
      );
      if(this.currentModule && this.currentModule.id){
        this.currentModuleVersion = await this.moduleVersionHttpService.createModuleVersion(
          this.currentModule.id,
          new ModuleVersion(this.currentModule.id,1,user, 1));
        // todo get le block si on est en train de modifier un déjà existant
        if (this.currentModuleVersion.id) {
          this.availableBlocks.push(
            new ParagraphBlock(this.currentModuleVersion.id, '', 1, user),
            new MusicBlock(this.currentModuleVersion.id, '', 1, user),
            new StatBlock(this.currentModuleVersion.id, '', 1, user),
            new IntegratedModuleBlock(this.currentModuleVersion.id, '', 1, user))
          // todo push l'imageblock une fois dispo
        }
      }
    }


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
    this.addBlock(EBlockType.paragraph);

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
  startIconDrag(event: Event, iconType: EBlockType) {
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
        this.addBlock(this.draggedIconType || EBlockType.paragraph, insertPosition);
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

  geticonByType(type: EBlockType) {
    switch (type) {
      case EBlockType.paragraph: return 'pi pi-comment';
      case EBlockType.music: return 'pi pi-microphone';
      case EBlockType.module: return 'pi pi-folder';
      case EBlockType.stat: return 'pi pi-chart-bar';
      default: return undefined;
    }
  }

  // Add a new block at the end of the list
  addBlock(type: EBlockType, position?: number) {
    let newBlock: Block | null = null;
    if(this.currentUser() && this.currentModuleVersion.id){
      switch(type){
        case EBlockType.paragraph:
          newBlock = new ParagraphBlock(this.currentModuleVersion.id,this.getBlockPreview(type)!,this.blocks.length-1,this.currentUser()!);
          break;
        case EBlockType.module:
          newBlock = new IntegratedModuleBlock(this.currentModuleVersion.id,this.getBlockPreview(type)!,this.blocks.length-1,this.currentUser()!);
          break;
        case EBlockType.music:
          newBlock = new MusicBlock(this.currentModuleVersion.id,this.getBlockPreview(type)!,this.blocks.length-1,this.currentUser()!);
          break;
        case EBlockType.stat:
          newBlock = new StatBlock(this.currentModuleVersion.id,this.getBlockPreview(type)!,this.blocks.length-1,this.currentUser()!);
          break;
        default: return
      }
    }
    if(newBlock){
      if(position) newBlock.blockOrder = position
      this.blockHttpService.post(newBlock).then((block: unknown) => {
        this.blocks.push(block as Block);
      })
    }
  }

  // Remove a block by ID
  removeBlock(blockId: number) {
    const index = this.blocks.findIndex(block => block.id === blockId);
    if (index !== -1) {
      this.blocks.splice(index, 1);
    }
  }

  // Handle drops (for reordering blocks)
  onDrop(event: CdkDragDrop<Block[]>) {
    moveItemInArray(this.blocks, event.previousIndex, event.currentIndex);
  }

  // Get block preview based on type
  getBlockPreview(type: EBlockType): string | undefined {
    switch (type) {
      case EBlockType.paragraph: return 'Block Paragraphe';
      case EBlockType.music: return 'Block Audio';
      case EBlockType.module: return 'Block Module';
      case EBlockType.stat: return 'Block de Statistique';
      default: return undefined;
    }
  }

  onUpload(event: FileUploadEvent) {
    for (const file of event.files) {
      this.uploadedFiles.push(file);
    }
  }

  save() {
    console.log(this.blocks)
  }
}

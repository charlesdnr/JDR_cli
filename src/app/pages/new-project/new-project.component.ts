import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
  OnDestroy,
  effect,
  HostListener,
} from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { TabsModule } from 'primeng/tabs';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ProjectParametersComponent } from '../../components/project-parameters/project-parameters.component';
import { Block } from '../../classes/Block';
import { ParagraphBlock } from '../../classes/ParagraphBlock';
import { ModuleVersion } from '../../classes/ModuleVersion';
import { MusicBlock } from '../../classes/MusicBlock';
import { IntegratedModuleBlock } from '../../classes/IntegratedModuleBlock';
import { GameSystem } from '../../classes/GameSystem';
import { StatBlock } from '../../classes/StatBlock';
import { PictureBlock } from '../../classes/PictureBlock';
import { EBlockType } from '../../enum/BlockType';
import { UserHttpService } from '../../services/https/user-http.service';
import { BlockHttpService } from '../../services/https/block-http.service';
import { ModuleHttpService } from '../../services/https/module-http.service';
import { ModuleVersionHttpService } from '../../services/https/module-version-http.service';
import { AiConfigComponent } from '../../components/ai-config/ai-config.component';
import { BlockTypesToolbarComponent } from '../../components/blocksComponents/block-types-toolbar/block-types-toolbar.component';
import { BlockListComponent } from '../../components/blocksComponents/block-list/block-list.component';
import { TranslateModule } from '@ngx-translate/core';
import {
  DialogService,
  DynamicDialogModule,
  DynamicDialogRef,
} from 'primeng/dynamicdialog';
import { ModuleRequest } from '../../classes/ModuleRequest';
import { ModuleService } from '../../services/module.service';
import { Module } from '../../classes/Module';
import { AnimationOptions } from 'ngx-lottie';
import { SkeletonModule } from 'primeng/skeleton';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../services/Notification.service';
import { StompSubscription } from '@stomp/stompjs';
import { CursorPosition } from '../../interfaces/CursorPosition';
import { ModuleUpdateDTO } from '../../interfaces/ModuleUpdateDTO';
import { ShareModuleDialogComponent } from '../../components/share-module-dialog/share-module-dialog.component';
import { UserSavedModuleHttpService } from '../../services/https/user-saved-module-http.service';
import { FolderService } from '../../services/folders.service';
import { UserSavedModule } from '../../classes/UserSavedModule';
import { cleanModuleForSave } from '../../utils/cleanBlocksForSave';

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
    SkeletonModule,
    ConfirmDialogModule,
    ButtonModule,
    SelectModule,
    TooltipModule,
    FormsModule
  ],
  providers: [ConfirmationService],
  templateUrl: './new-project.component.html',
  styleUrl: './new-project.component.scss',
  animations: [
    trigger('slideUpFade', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(40px)' }),
        animate('0.4s cubic-bezier(0.25, 0.8, 0.25, 1)', 
          style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('slideInFromLeft', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-30px)' }),
        animate('0.5s cubic-bezier(0.23, 1, 0.32, 1)', 
          style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ]),
    trigger('slideInFromTop', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-20px)' }),
        animate('0.4s cubic-bezier(0.23, 1, 0.32, 1)', 
          style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('fadeSlideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(15px)' }),
        animate('0.3s cubic-bezier(0.25, 0.8, 0.25, 1)', 
          style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('0.3s ease-out', style({ opacity: 1 }))
      ])
    ])
  ],
})
export class NewProjectComponent implements OnInit, OnDestroy {
  private moduleService = inject(ModuleService);
  private userService = inject(UserHttpService);
  private blockHttpService = inject(BlockHttpService);
  private moduleHttpService = inject(ModuleHttpService);
  private moduleVersionHttpService = inject(ModuleVersionHttpService);
  public dialogService = inject(DialogService);
  public confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private notificationService = inject(NotificationService);
  private folderService = inject(FolderService);
  private userSavedModuleHttpService = inject(UserSavedModuleHttpService);

  currentModule = this.moduleService.currentModule;
  loadingModuleState = this.moduleService.loadingModule;
  currentUser = computed(() => this.userService.currentJdrUser());
  currentGameSystem = signal<GameSystem | undefined>(undefined);
  currentVersion = this.moduleService.currentModuleVersion;
  blocks = computed(() => this.currentVersion()?.blocks);

  ref: DynamicDialogRef | undefined;

  // Enums
  enumBlockType = EBlockType;

  options: AnimationOptions = {
    path: 'assets/lottie/empty_blocks.json',
  };

  // States
  availableBlocks: Block[] = [];
  isDraggingIcon = signal(false);
  draggedIconType: EBlockType | null = null;
  activeIconElement: HTMLElement | null = null;
  dragPosition = { x: 0, y: 0 };
  isOverDropZone = signal(false);
  insertPosition = signal<number | null>(null);

  initialSetupDone = signal(false);

  loadingSave = signal(false);

  private routeSubscription: Subscription | undefined;
  private subscription: StompSubscription | undefined;

  userRights = computed(() => this.moduleService.userAccessRights());
  isReadOnly = computed(() => !this.userRights().canEdit);
  canPublish = computed(() => this.userRights().canPublish);
  canInvite = computed(() => this.userRights().canInvite);
  canView = computed(() => this.userRights().canView);

  // ===== FLOATING ACTION BAR SIGNALS =====
  secondaryMenuExpanded = signal(false);
  hasUnsavedChanges = signal(false);
  needToCreate = computed(() => !this.currentModule()?.id);
  loadingPublished = signal(false);

  otherUserCursors = this.notificationService.userCursors;
  private cursorSubscription: StompSubscription | undefined;
  private updateSubscription: StompSubscription | undefined;

  private cursorPositionsMap = new Map<
    number,
    {
      current: { x: number; y: number };
      target: { x: number; y: number };
    }
  >();
  private animationFrameId: number | null = null;

  // Pour le suivi du curseur
  private mouseMoveThrottle = 0;

  constructor() {

    effect(() => {
      const module = this.currentModule();
      if (!module || module.id === 0 || this.isReadOnly()) return;

      // Établir les connections WebSocket si nécessaire
      if (!this.notificationService.isConnected()) {
        this.notificationService.connect().then(() => {
          this.setupCollaborativeFunctions(module.id);
        });
      } else {
        this.setupCollaborativeFunctions(module.id);
      }
    });
  }

  setupCollaborativeFunctions(moduleId: number): void {
    // S'abonner aux curseurs des autres utilisateurs
    this.cursorSubscription =
      this.notificationService.subscribeToModuleCursors(moduleId);

    // S'abonner aux mises à jour du contenu
    this.updateSubscription = this.notificationService.subscribeToModuleUpdates(
      moduleId,
      (update) => this.handleModuleUpdate(update)
    );

    this.startCursorAnimation();
  }

  private startCursorAnimation(): void {
    const animate = () => {
      this.updateCursorPositions();
      this.animationFrameId = requestAnimationFrame(animate);
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  private updateCursorPositions(): void {
    // Mettre à jour la position du curseur avec interpolation
    this.notificationService.userCursors().forEach((cursor) => {
      // Ignorer notre propre curseur
      if (cursor.userId === this.currentUser()?.id) return;

      // Récupérer ou créer l'entrée dans la map
      if (!this.cursorPositionsMap.has(cursor.userId)) {
        this.cursorPositionsMap.set(cursor.userId, {
          current: { x: cursor.position.x, y: cursor.position.y },
          target: { x: cursor.position.x, y: cursor.position.y },
        });
        return;
      }

      // Mettre à jour la position cible
      const positions = this.cursorPositionsMap.get(cursor.userId)!;
      positions.target = { x: cursor.position.x, y: cursor.position.y };

      // Interpolation fluide
      positions.current.x += (positions.target.x - positions.current.x) * 0.3;
      positions.current.y += (positions.target.y - positions.current.y) * 0.3;

      // Mettre à jour les coordonnées CSS dans le DOM directement pour éviter les cycles de détection
      const cursorElement = document.querySelector(
        `.remote-cursor[data-user-id="${cursor.userId}"]`
      );
      if (cursorElement) {
        (cursorElement as HTMLElement).style.left = `${positions.current.x}px`;
        (cursorElement as HTMLElement).style.top = `${positions.current.y}px`;
      }
    });
  }

  // Ajouter ceci à votre classe NewProjectComponent
  @HostListener('document:mousemove', ['$event'])
  onDocumentMouseMove(event: MouseEvent): void {
    // Gestion du drag & drop (garder votre code existant)
    if (this.isDraggingIcon()) {
      this.dragPosition = { x: event.clientX, y: event.clientY };
      // Autre logique existante pour le drag...
      return;
    }

    // Si en lecture seule ou pas de module actif, ne rien faire
    if (this.isReadOnly() || !this.currentModule()?.id) return;

    // Throttle pour limiter les envois
    if (this.mouseMoveThrottle) {
      window.clearTimeout(this.mouseMoveThrottle);
    }

    this.mouseMoveThrottle = window.setTimeout(() => {
      this.sendCursorPosition(event.clientX, event.clientY - 90);
    }, 50); // 50ms de throttle pour éviter trop d'envois
  }

  private sendCursorPosition(x: number, y: number): void {
    const currentUser = this.currentUser();
    const module = this.currentModule();
    if (!currentUser || !module || module.id === 0) return;

    const cursorPosition: CursorPosition = {
      userId: currentUser.id,
      username: currentUser.username || 'Utilisateur',
      blockId: 0, // Pas important dans ce cas
      position: { x, y },
      userColor: this.getUserColor(currentUser.id),
      timestamp: Date.now(),
    };

    this.notificationService.sendCursorPosition(module.id, cursorPosition);
  }

  // Gestion des mises à jour reçues du WebSocket
  handleModuleUpdate(update: ModuleUpdateDTO): void {
    // Ignorer nos propres mises à jour
    const currentUser = this.userService.currentJdrUser();
    if (currentUser && update.userId === currentUser.id) return;

    // Trouver le bloc concerné dans le module actuel
    const version = this.currentVersion();
    if (!version || !version.blocks) return;

    const blockIndex = version.blocks.findIndex((b) => b.id === update.blockId);
    if (blockIndex === -1) return;

    const block = version.blocks[blockIndex];

    // Appliquer la mise à jour selon le type d'opération
    if (block instanceof ParagraphBlock) {
      switch (update.operation) {
        case 'insert':
        case 'delete':
        case 'update':
          // Mise à jour du contenu du bloc
          this.updateBlockContent(blockIndex, update.content);
          break;
      }
    }
  }

  // Méthode utilitaire pour mettre à jour un bloc
  updateBlockContent(blockIndex: number, content: string): void {
    const version = this.currentVersion();
    if (!version || !version.blocks) return;

    const block = version.blocks[blockIndex];

    if (block instanceof ParagraphBlock) {
      block.paragraph = content;
    } else if (block instanceof StatBlock) {
      // Mise à jour selon le type de bloc
    }

    // Forcer la mise à jour du signal
    this.moduleService.currentModuleVersion.update((version) => {
      if (!version) return undefined;

      const updatedBlocks = [...version.blocks];
      updatedBlocks[blockIndex] = block;

      return { ...version, blocks: updatedBlocks };
    });
  }

  onBlockCursorPosition(event: {
    blockId: number;
    position: DOMRect;
    elementId: string;
  }) {
    const cursorPosition: CursorPosition = {
      userId: this.currentUser()?.id || 0,
      username: this.currentUser()?.username || 'Utilisateur',
      blockId: event.blockId,
      position: {
        x: event.position.left,
        y: event.position.top,
      },
      elementId: event.elementId,
      userColor: this.getUserColor(this.currentUser()?.id || 0),
      timestamp: Date.now(),
    };

    // Envoyer la position via le service de notification
    if (this.currentModule()?.id) {
      this.notificationService.sendCursorPosition(
        this.currentModule()!.id,
        cursorPosition
      );
    }
  }

  // Méthode d'aide pour générer une couleur unique pour chaque utilisateur
  getUserColor(userId: number): string {
    const hue = (userId * 137) % 360;
    return `hsl(${hue}, 70%, 50%)`;
  }

  ngOnInit() {
    this.initializeAvailableBlocks();

    // Combinaison des paramètres de route et de requête
    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      const moduleIdParam = params.get('moduleId');

      if (moduleIdParam) {
        const moduleId = parseInt(moduleIdParam, 10);
        if (!isNaN(moduleId)) {
          // Chargement du module
          this.moduleService.loadModuleById(moduleId).then(async () => {
            // Une fois le module chargé, récupérer le paramètre de requête versionId
            this.route.queryParamMap.subscribe((queryParams) => {
              const versionIdParam = queryParams.get('versionId');
              const module = this.currentModule();

              if (versionIdParam && module) {
                const versionId = parseInt(versionIdParam, 10);
                const selectedVersion = module.versions.find(
                  (v) => v.id === versionId
                );

                if (selectedVersion) {
                  // Si la version spécifiée existe, la définir comme courante
                  this.moduleService.currentModuleVersion.set(selectedVersion);
                } else {
                  // Si la version spécifiée n'existe pas, sélectionner la première par défaut
                  this.selectDefaultVersionAndUpdateURL();
                }

                if (!this.canView()) {
                  this.router.navigate(['/home']);
                  this.messageService.add({
                    severity: 'info',
                    summary: 'Accès refusé',
                    detail: "Vous n'avez pas accès à ce module.",
                  });
                  return;
                }
              } else if (module && module.versions.length > 0) {
                // Si aucun versionId n'est spécifié, sélectionner la première version
                this.selectDefaultVersionAndUpdateURL();
              }
            });
          });
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'ID de module invalide.',
          });
          this.router.navigate(['/projects']);
        }
      } else if (this.route.snapshot.routeConfig?.path === 'new-module') {
        this.moduleService.prepareNewModule();
      } else {
        this.router.navigate(['/projects']);
      }
    });
  }

  selectDefaultVersionAndUpdateURL() {
    const module = this.currentModule();
    if (module && module.versions && module.versions.length > 0) {
      const defaultVersion = module.versions[0];
      this.moduleService.currentModuleVersion.set(defaultVersion);

      // Mise à jour de l'URL avec le paramètre de requête pour la version par défaut
      if (module.id && defaultVersion.id) {
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { versionId: defaultVersion.id },
          queryParamsHandling: 'merge', // préserve les autres paramètres
          replaceUrl: true,
        });
      }
    }
  }

  updateCurrentVersion(version: ModuleVersion) {
    this.moduleService.currentModuleVersion.set(version);

    // Mise à jour de l'URL pour refléter la nouvelle version sélectionnée
    if (version.id) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { versionId: version.id },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
  }

  ngOnDestroy() {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.cursorSubscription) {
      this.cursorSubscription.unsubscribe();
    }
    if (this.updateSubscription) {
      this.updateSubscription.unsubscribe();
    }
    if (this.mouseMoveThrottle) {
      window.clearTimeout(this.mouseMoveThrottle);
    }
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private initializeAvailableBlocks() {
    const user = this.currentUser();
    if (user) {
      const tempModuleVersionId = 0; // ID temporaire, sera mis à jour lors de la sauvegarde
      this.availableBlocks = [
        new ParagraphBlock(tempModuleVersionId, 'Preview Paragraphe', 0, user),
        new MusicBlock(tempModuleVersionId, 'Preview Musique', 1, user),
        new StatBlock(tempModuleVersionId, 'Preview Stats', 2, user),
        new PictureBlock(tempModuleVersionId, 'Preview Image', 3, user),
        new IntegratedModuleBlock(
          tempModuleVersionId,
          'Preview Module Intégré',
          4,
          user
        ),
      ];
    } else {
      // Gérer le cas où l'utilisateur n'est pas disponible (peu probable avec le guard)
      this.availableBlocks = [];
    }
  }

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

  onGameSystemChange(system: GameSystem) {
    this.currentGameSystem.set(system);
    this.currentVersion.update((version: ModuleVersion | undefined) => {
      if (version)
        version.gameSystemId = system?.id ?? version.gameSystemId ?? undefined;
      return version;
    });
  }

  async save() {
    const module = this.currentModule();
    const version = this.currentVersion();

    if (!module || !module.creator || !version) {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Données du module ou utilisateur manquantes.',
      });
      return;
    }

    this.loadingSave.set(true);

    if (this.currentGameSystem()) {
      version.gameSystemId = this.currentGameSystem()!.id;
    }

    // Nettoyer le module en supprimant les IDs temporaires des blocs
    const cleanedModule = cleanModuleForSave(module);

    const moduleRequest = new ModuleRequest(
      cleanedModule.title,
      cleanedModule.description,
      cleanedModule.isTemplate,
      cleanedModule.type,
      cleanedModule.creator!,
      cleanedModule.picture,
      cleanedModule.versions,
      cleanedModule.accesses
    );

    try {
      let savedModule: Module;
      if (module.id === 0) {
        // Création
        savedModule = await this.moduleHttpService.createModule(moduleRequest);

        await this.addModuleToFirstFolder(savedModule);

        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Module créé avec succès !',
        });
        this.moduleService.setCurrentModule(savedModule);
        this.moduleService.currentModuleVersion.set(
          this.moduleService.currentModule()?.versions[0]
        );
        this.router.navigate(['/module', savedModule.id], { replaceUrl: true });
      } else {
        // Mise à jour
        savedModule = await this.moduleHttpService.updateModule(
          module.id!,
          moduleRequest
        );
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Module mis à jour avec succès !',
        });
        // this.moduleService.setCurrentModule(savedModule);
        // this.moduleService.setCurrentVersion(version)
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du module :', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'La sauvegarde a échoué.',
      });
    } finally {
      this.loadingSave.set(false);
    }
  }

  private async addModuleToFirstFolder(savedModule: Module): Promise<void> {
  try {
    const currentUser = this.currentUser();
    if (!currentUser) return;

    // Charger les dossiers de l'utilisateur
    await this.folderService.loadFolders();
    const userFolders = this.folderService.currentFolders();
    
    if (userFolders.length > 0) {
      // Prendre le premier dossier
      const firstFolder = userFolders[0];
      
      if (firstFolder.folderId && savedModule.versions.length > 0) {
        // Créer une association UserSavedModule
        const userSavedModule = new UserSavedModule(
          currentUser.id,
          savedModule.id,
          savedModule.versions[0].id!,
          firstFolder.folderId
        );
        
        // Sauvegarder l'association
        await this.userSavedModuleHttpService.saveModule(userSavedModule);
        
      }
    }
  } catch (error) {
    console.error('Erreur lors de l\'ajout du module au premier dossier:', error);
    // Ne pas faire échouer la création du module si l'ajout au dossier échoue
  }
}

  // Méthode pour générer avec l'IA
  generateAIContent(data: { blockId: number; blockType: string }) {
    this.dialogService
      .open(AiConfigComponent, {
        showHeader: false,
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
    if (blockType == EBlockType.paragraph) {
      (
        this.currentVersion()?.blocks.find(
          (block) => block.id === blockId
        ) as ParagraphBlock
      ).paragraph = response;
      const block: ParagraphBlock = this.currentVersion()?.blocks.find(
        (block) => block.id === blockId
      ) as ParagraphBlock;
      this.currentVersion()?.blocks.map((blocks, index) => {
        if (index !== -1 && this.currentVersion()?.blocks) {
          this.currentVersion()!.blocks[index] = block;
        }
      });

    }
  }

  generateCompleteModule() {
    this.ref = this.dialogService.open(AiConfigComponent, {
      showHeader: false,
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

        // Update the current module with metadata
        this.currentModule.update((module) => {
          if (module) {
            return {
              ...module,
              title: moduleData.title || module.title,
              description: moduleData.description || module.description,
            };
          } else {
            return null;
          }
        });

        // Update game system if provided
        // if (moduleData.gameSystemId) {
        //   const gameSystemId = parseInt(moduleData.gameSystemId);
        //   const gameSystem = this.gameSystems().find(
        //     (gs) => gs.id === gameSystemId
        //   );
        //   if (gameSystem) {
        //     this.currentGameSystem.set(gameSystem);

        //     // Update the moduleVersion
        //     this.currentVersion.update((version) => {
        //       if(version){
        //         return {
        //           ...version,
        //           gameSystemId: gameSystemId,
        //         }
        //       } else {
        //         return version
        //       }
        //     });
        //   }
        // }

        // Clear existing blocks and create new ones from the response
        if (moduleData.blocks && Array.isArray(moduleData.blocks)) {
          // Create a new array for blocks
          const newBlocks: Block[] = [];

          // Process each block from the response
          moduleData.blocks.forEach((block: Block, index: number) => {
            const module = this.currentModule();
            if (module) {
              if (this.currentUser()) {
                let newBlock: Block | null = null;

                switch (block.type) {
                  case 'paragraph':
                    newBlock = new ParagraphBlock(
                      module.id,
                      block.title || 'Paragraphe généré',
                      index,
                      this.currentUser()!,
                      (block as ParagraphBlock).paragraph || '',
                      (block as ParagraphBlock).style || 'narrative'
                    );
                    break;

                  case 'music':
                    newBlock = new MusicBlock(
                      module.id,
                      block.title || 'Musique générée',
                      index,
                      this.currentUser()!,
                      (block as MusicBlock).label ||
                        block.title ||
                        'Ambiance musicale',
                      (block as MusicBlock).src || ''
                    );
                    break;

                  case 'stat':
                    newBlock = new StatBlock(
                      module.id,
                      block.title || 'Statistiques générées',
                      index,
                      this.currentUser()!,
                      (block as StatBlock).statRules || '',
                      (block as StatBlock).statValues || ''
                    );
                    break;

                  case 'picture':
                    newBlock = new PictureBlock(
                      module.id,
                      block.title || 'Statistiques générées',
                      index,
                      this.currentUser()!,
                      (block as PictureBlock)?.picture,
                      (block as PictureBlock)?.label ?? '',
                    );
                    break;
                }

                if (newBlock) {
                  // Give each block a temporary ID
                  newBlock.id = index + 1;
                  newBlocks.push(newBlock);
                }
              }
            }
          });

          // Update blocks signal with the new array
          this.currentVersion()!.blocks = newBlocks;
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

  deleteModule() {
    const module = this.currentModule();
    if (module && module.id !== 0) {
      this.confirmationService.confirm({
        message: 'Étes-vous sûr de vouloir supprimer ce module ?',
        header: 'Confirmation',
        closable: true,
        closeOnEscape: true,
        icon: 'pi pi-exclamation-triangle',
        rejectButtonProps: {
          label: 'Cancel',
          severity: 'secondary',
          outlined: true,
        },
        acceptButtonProps: {
          label: 'Confirmer',
          severity: 'danger',
        },
        accept: () => {
          if (this.currentModule()?.id)
            this.acceptDelete(this.currentModule()!.id);
        },
      });
    } else {
      this.messageService.add({
        severity: 'info',
        summary: 'Info',
        detail: 'Impossible de supprimer un module non sauvegardé.',
      });
    }
  }

  async acceptDelete(moduleId: number) {
    this.messageService.clear('confirmDelete');
    if (!moduleId) return;

    try {
      await this.moduleHttpService.deleteModule(moduleId);
      this.messageService.add({
        severity: 'success',
        summary: 'Succès',
        detail: 'Module supprimé avec succès.',
      });
      this.moduleService.clearCurrentModule();
      this.router.navigate(['/projects']);
    } catch (error) {
      console.error(
        `Erreur lors de la suppression du module ${moduleId}:`,
        error
      );
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Impossible de supprimer le module.',
      });
    }
  }

  // ===== FLOATING ACTION BAR METHODS =====
  
  toggleSecondaryMenu(): void {
    this.secondaryMenuExpanded.set(!this.secondaryMenuExpanded());
  }

  closeSecondaryMenu(): void {
    this.secondaryMenuExpanded.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.secondaryMenuExpanded()) {
      this.closeSecondaryMenu();
    }
  }

  // Action methods that delegate to existing functionality
  published(): void {
    if (!this.canPublish() || !this.currentVersion()) return;
    
    const currentVersion = this.currentVersion()!;
    currentVersion.published = !currentVersion.published;
    this.loadingPublished.set(true);
    
    this.moduleVersionHttpService
      .updateModuleVersion(currentVersion.id!, currentVersion)
      .then(() => {
        if (currentVersion.published) {
          this.messageService.add({
            severity: 'success',
            summary: 'Publication',
            detail: 'Le module a été publié avec succès',
          });
        } else {
          this.messageService.add({
            severity: 'success',
            summary: 'Publication',
            detail: 'Le module a été rendu privé',
          });
        }
      })
      .catch((error) => {
        // Restaurer l'état précédent en cas d'erreur
        currentVersion.published = !currentVersion.published;
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de modifier le statut de publication',
        });
        console.error('Erreur lors de la publication:', error);
      })
      .finally(() => {
        this.loadingPublished.set(false);
      });
  }

  shareModule(): void {
    this.closeSecondaryMenu();
    
    if (!this.currentModule() || this.needToCreate()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Partage impossible',
        detail: 'Vous devez d\'abord sauvegarder le module'
      });
      return;
    }

    // Ouvrir un dialog avec les options de partage
    this.ref = this.dialogService.open(ShareModuleDialogComponent, {
      header: 'Partager le module',
      width: '500px',
      modal: true,
      closable: true,
      data: {
        module: this.currentModule(),
        currentUser: this.currentUser(),
        canInvite: this.canInvite()
      }
    });

    this.ref.onClose.subscribe((result) => {
      if (result) {
        this.messageService.add({
          severity: 'success',
          summary: 'Partage',
          detail: 'Permissions mises à jour avec succès'
        });
      }
    });
  }


  duplicateModule(): void {
    this.closeSecondaryMenu();
    // TODO: Implement duplicate functionality
    this.messageService.add({
      severity: 'info',
      summary: 'Duplication',
      detail: 'Module dupliqué avec succès'
    });
  }

  openSettings(): void {
    this.closeSecondaryMenu();
    // TODO: Open settings modal or navigate to settings
    this.messageService.add({
      severity: 'info',
      summary: 'Paramètres',
      detail: 'Ouverture des paramètres...'
    });
  }

  // ===== UTILITY METHODS FOR NEW UI =====
  
  /**
   * Generate a unique gradient for module avatar based on module properties
   */
  getModuleGradient(module: Module): string {
    if (!module) return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    
    const id = module.id || 1;
    const gradients = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      'linear-gradient(135deg, #fad0c4 0%, #ffd1ff 100%)',
      'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    ];
    
    return gradients[id % gradients.length];
  }

  /**
   * Get user initials for avatar display
   */
  getInitials(name: string): string {
    if (!name) return '?';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  /**
   * Navigate back to projects page
   */
  navigateToProjects(): void {
    this.router.navigate(['/projects']);
  }

  /**
   * Calculate total word count in all blocks
   */
  calculateWordCount(blocks: Block[] | undefined): number {
    if (!blocks) return 0;
    
    let totalWords = 0;
    blocks.forEach(block => {
      if (block instanceof ParagraphBlock) {
        const text = block.paragraph || '';
        const words = text.trim().split(/\s+/).filter(word => word.length > 0);
        totalWords += words.length;
      }
    });
    
    return totalWords;
  }

  /**
   * Estimate reading time based on word count (average 200 words per minute)
   */
  getReadingTime(blocks: Block[] | undefined): number {
    const wordCount = this.calculateWordCount(blocks);
    return Math.max(1, Math.ceil(wordCount / 200));
  }

  /**
   * Format time ago in French
   */
  getTimeAgo(date: string | Date | undefined): string {
    if (!date) return 'Inconnu';
    
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'À l\'instant';
    if (diffInSeconds < 3600) return `Il y a ${Math.floor(diffInSeconds / 60)}min`;
    if (diffInSeconds < 86400) return `Il y a ${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 2592000) return `Il y a ${Math.floor(diffInSeconds / 86400)}j`;
    if (diffInSeconds < 31536000) return `Il y a ${Math.floor(diffInSeconds / 2592000)}mois`;
    return `Il y a ${Math.floor(diffInSeconds / 31536000)}an`;
  }
}

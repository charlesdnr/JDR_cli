// src/app/pages/new-project/new-project.component.ts
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
import { CommonModule, DatePipe } from '@angular/common'; // Import DatePipe
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
import { EBlockType } from '../../enum/BlockType';
import { UserHttpService } from '../../services/https/user-http.service';
// import { BlockHttpService } from '../../services/https/block-http.service'; // Not directly used now
import { ModuleHttpService } from '../../services/https/module-http.service';
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
import { LottieComponent, AnimationOptions } from 'ngx-lottie';
import { SkeletonModule } from 'primeng/skeleton';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ButtonModule } from 'primeng/button';
import { NotificationService } from '../../services/Notification.service';
import { StompSubscription } from '@stomp/stompjs';
import { CursorPosition } from '../../interfaces/CursorPosition';
import { ModuleUpdateDTO } from '../../interfaces/ModuleUpdateDTO';
import { LockHttpService } from '../../services/https/lock-http.service';
import { ConflictHttpService } from '../../services/https/conflict-http.service'; // Removed MergeResult as it's not used here
import { ResourceType } from '../../enum/ResourceType';
import { LockAcquisitionRequestDTO } from '../../interfaces/lock/LockAcquisitionRequestDTO';
import { LockResult } from '../../interfaces/lock/LockResult';
import { ConflictDTO } from '../../interfaces/conflict/ConflictDTO';
import { FieldResolutionDTO } from '../../interfaces/conflict/FieldResolutionDTO';
import { ConflictResolutionRequestDTO } from '../../interfaces/conflict/ConflictResolutionRequestDTO';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { BadgeModule } from 'primeng/badge';


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
    LottieComponent,
    SkeletonModule,
    ConfirmDialogModule,
    ButtonModule,
    ProgressSpinnerModule,
    BadgeModule,
  ],
  providers: [ConfirmationService, DatePipe], // Add DatePipe here
  templateUrl: './new-project.component.html',
  styleUrl: './new-project.component.scss',
})
export class NewProjectComponent implements OnInit, OnDestroy {
  private moduleService = inject(ModuleService);
  private userService = inject(UserHttpService);
  // private blockHttpService = inject(BlockHttpService); // Not directly used for now
  private moduleHttpService = inject(ModuleHttpService);
  public dialogService = inject(DialogService);
  public confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private notificationService = inject(NotificationService);
  private lockService = inject(LockHttpService);
  private conflictService = inject(ConflictHttpService);
  private datePipe = inject(DatePipe); // Inject DatePipe

  currentModule = this.moduleService.currentModule;
  loadingModuleState = this.moduleService.loadingModule;
  currentUser = computed(() => this.userService.currentJdrUser());
  currentGameSystem = signal<GameSystem | undefined>(undefined);
  currentVersion = this.moduleService.currentModuleVersion;
  blocks = computed(() => this.currentVersion()?.blocks);

  ref: DynamicDialogRef | undefined;

  enumBlockType = EBlockType;
  enumResourceType = ResourceType;

  options: AnimationOptions = {
    path: 'assets/lottie/empty_blocks.json',
  };

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

  currentLockToken = signal<string | null>(null);
  isLockedByCurrentUser = signal<boolean>(false);
  lockStatusMessage = signal<string | null>(null);
  activeConflicts = signal<ConflictDTO[]>([]);
  isLoadingLock = signal<boolean>(false);
  isLoadingConflicts = signal<boolean>(false);

  isEffectivelyReadOnly = computed(() => {
    if (this.currentModule()?.id === 0) return false;
    return this.isReadOnly() || !this.isLockedByCurrentUser();
  });

  parameterTabConflictsCount = computed(() => {
    const module = this.currentModule();
    if (!module) return 0;
    return this.activeConflicts().filter(
      c => c.resourceType === ResourceType.MODULE_METADATA ||
           (c.resourceType === ResourceType.MODULE && c.resourceId === module.id)
    ).length;
  });

  hasParameterTabConflicts = computed(() => this.parameterTabConflictsCount() > 0);

  otherUserCursors = this.notificationService.userCursors;
  private cursorSubscription: StompSubscription | undefined;
  private updateSubscription: StompSubscription | undefined;

  cursorPositionsMap = new Map<number, {
    current: { x: number, y: number },
    target: { x: number, y: number }
  }>();
  private animationFrameId: number | null = null;
  private mouseMoveThrottle = 0;

  constructor() {
    effect(() => {
      if (
        this.notificationService.isConnected() &&
        this.currentModule()?.id
      ) {
        this.subscribeToAccessChanges(this.currentModule()!.id);
      }
    });

    effect(() => {
      const module = this.currentModule();
      if (!module || module.id === 0 || this.isEffectivelyReadOnly()) return;

      if (!this.notificationService.isConnected()) {
        this.notificationService.connect().then(() => {
          if (module.id) this.setupCollaborativeFunctions(module.id);
        });
      } else {
        if (module.id) this.setupCollaborativeFunctions(module.id);
      }
    });

     effect(() => {
      const version = this.currentVersion();
      const module = this.currentModule();
      // Ensure initialSetupDone is true before reacting to version/module changes for locks/conflicts
      if (version && version.id && module && module.id !== 0 && this.initialSetupDone()) {
        this.attemptLockAcquisition();
        this.fetchConflicts();
      }
    });
  }

  setupCollaborativeFunctions(moduleId: number): void {
    this.cursorSubscription = this.notificationService.subscribeToModuleCursors(moduleId);
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
    this.notificationService.userCursors().forEach(cursor => {
      if (cursor.userId === this.currentUser()?.id) return;
      if (!this.cursorPositionsMap.has(cursor.userId)) {
        this.cursorPositionsMap.set(cursor.userId, {
          current: { x: cursor.position.x, y: cursor.position.y },
          target: { x: cursor.position.x, y: cursor.position.y }
        });
        return;
      }
      const positions = this.cursorPositionsMap.get(cursor.userId)!;
      positions.target = { x: cursor.position.x, y: cursor.position.y };
      positions.current.x += (positions.target.x - positions.current.x) * 0.3;
      positions.current.y += (positions.target.y - positions.current.y) * 0.3;
      const cursorElement = document.querySelector(`.remote-cursor[data-user-id="${cursor.userId}"]`) as HTMLElement | null;
      if (cursorElement) {
        cursorElement.style.left = `${positions.current.x}px`;
        cursorElement.style.top = `${positions.current.y}px`;
      }
    });
  }

  @HostListener('document:mousemove', ['$event'])
  onDocumentMouseMove(event: MouseEvent): void {
    if (this.isDraggingIcon()) {
      this.dragPosition = { x: event.clientX, y: event.clientY };
      return;
    }
    if (this.isEffectivelyReadOnly() || !this.currentModule()?.id) return;
    if (this.mouseMoveThrottle) {
      window.clearTimeout(this.mouseMoveThrottle);
    }
    this.mouseMoveThrottle = window.setTimeout(() => {
      this.sendCursorPosition(event.clientX, event.clientY - 90); // Adjust Y based on header height or other offsets
    }, 50);
  }

  private sendCursorPosition(x: number, y: number): void {
    const currentUser = this.currentUser();
    const module = this.currentModule();
    if (!currentUser || !module || module.id === 0) return;
    const cursorPosition: CursorPosition = {
      userId: currentUser.id,
      username: currentUser.username || 'Utilisateur',
      blockId: 0, // Or the current block ID if applicable
      position: { x, y },
      userColor: this.getUserColor(currentUser.id),
      timestamp: Date.now()
    };
    this.notificationService.sendCursorPosition(module.id, cursorPosition);
  }

  handleModuleUpdate(update: ModuleUpdateDTO): void {
    const currentUser = this.userService.currentJdrUser();
    if (currentUser && update.userId === currentUser.id) return; // Ignore self-updates
    const version = this.currentVersion();
    if (!version || !version.blocks) return;
    const blockIndex = version.blocks.findIndex(b => b.id === update.blockId);
    if (blockIndex === -1) return;
    const block = version.blocks[blockIndex];
    if (block instanceof ParagraphBlock) {
      switch (update.operation) {
        case 'insert': case 'delete': case 'update':
          this.updateBlockContent(blockIndex, update.content);
          break;
      }
    }
    // Add handling for other block types if necessary
  }

  updateBlockContent(blockIndex: number, content: string): void {
    const version = this.currentVersion();
    if (!version || !version.blocks) return;
    const block = version.blocks[blockIndex]; // This is a reference
    if (block instanceof ParagraphBlock) {
      block.paragraph = content; // Modify the reference
    }
    // For other block types, update their specific content properties.

    // To trigger change detection for signals when an object property within an array changes:
    this.moduleService.currentModuleVersion.update(v => {
      if (!v) return undefined;
      // Create a new array with the modified block to ensure change detection
      const updatedBlocks = [...v.blocks];
      updatedBlocks[blockIndex] = {...block}; // Create a new object for the block as well
      if (block instanceof ParagraphBlock) { (updatedBlocks[blockIndex] as ParagraphBlock).paragraph = content;}
      // Add similar updates for other block types if needed

      return { ...v, blocks: updatedBlocks };
    });
  }

  onBlockCursorPosition(event: { blockId: number, position: DOMRect, elementId: string }) {
    const currentUser = this.currentUser();
    const module = this.currentModule();
    if (!currentUser || !module || module.id === 0) return;

    const cursorPosition: CursorPosition = {
      userId: currentUser.id,
      username: currentUser.username || 'Utilisateur',
      blockId: event.blockId,
      position: {
        x: event.position.left, // Use absolute position from DOMRect
        y: event.position.top   // Use absolute position from DOMRect
      },
      elementId: event.elementId,
      userColor: this.getUserColor(currentUser.id),
      timestamp: Date.now()
    };
    this.notificationService.sendCursorPosition(module.id, cursorPosition);
  }

  getUserColor(userId: number): string {
    const hue = (userId * 137) % 360;
    return `hsl(${hue}, 70%, 50%)`;
  }

  async ngOnInit() {
    this.initializeAvailableBlocks();
    this.routeSubscription = this.route.paramMap.subscribe(async (params) => {
      const moduleIdParam = params.get('moduleId');
      if (moduleIdParam) {
        const moduleId = parseInt(moduleIdParam, 10);
        if (!isNaN(moduleId)) {
          await this.moduleService.loadModuleById(moduleId);
          this.route.queryParamMap.subscribe((queryParams) => {
            const versionIdParam = queryParams.get('versionId');
            const module = this.currentModule();
            if (versionIdParam && module) {
              const versionId = parseInt(versionIdParam, 10);
              const selectedVersion = module.versions.find((v) => v.id === versionId);
              if (selectedVersion) {
                this.moduleService.currentModuleVersion.set(selectedVersion);
              } else {
                this.selectDefaultVersionAndUpdateURL();
              }
              if (!this.canView()) {
                this.router.navigate(['/home']);
                this.messageService.add({ severity: 'info', summary: 'Accès refusé', detail: "Vous n'avez pas accès à ce module." });
                return;
              }
            } else if (module && module.versions.length > 0) {
              this.selectDefaultVersionAndUpdateURL();
            }
            this.initialSetupDone.set(true); // Set here, after module/version is potentially loaded/set
          });
        } else {
          this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'ID de module invalide.' });
          this.router.navigate(['/projects']);
        }
      } else if (this.route.snapshot.routeConfig?.path === 'new-module') {
        this.moduleService.prepareNewModule();
        this.isLockedByCurrentUser.set(true); // New modules are editable by default by the creator
        this.lockStatusMessage.set("Nouveau module, édition activée.");
        this.initialSetupDone.set(true); // New module is also considered "setup"
      } else {
        this.router.navigate(['/projects']);
      }
    });
  }

  async ngOnDestroy() {
    if (this.routeSubscription) this.routeSubscription.unsubscribe();
    if (this.subscription) this.subscription.unsubscribe();
    if (this.cursorSubscription) this.cursorSubscription.unsubscribe();
    if (this.updateSubscription) this.updateSubscription.unsubscribe();
    if (this.mouseMoveThrottle) window.clearTimeout(this.mouseMoveThrottle);
    if (this.animationFrameId !== null) cancelAnimationFrame(this.animationFrameId);
    await this.releaseCurrentLock();
    this.clearLockRenewal();
  }

  private initializeAvailableBlocks() {
    const user = this.currentUser();
    if (user) {
      const tempModuleVersionId = 0;
      this.availableBlocks = [
        new ParagraphBlock(tempModuleVersionId, 'Preview Paragraphe', 0, user),
        new MusicBlock(tempModuleVersionId, 'Preview Musique', 1, user),
        new StatBlock(tempModuleVersionId, 'Preview Stats', 2, user),
        new IntegratedModuleBlock(tempModuleVersionId, 'Preview Module Intégré', 3, user),
      ];
    } else { this.availableBlocks = []; }
  }

  private subscribeToAccessChanges(moduleId: number): void {
    if (!this.notificationService.isConnected()) {
      this.notificationService.connect().then(() => this.setupAccessSubscription(moduleId));
    } else {
      this.setupAccessSubscription(moduleId);
    }
  }

  private setupAccessSubscription(moduleId: number): void {
    const currentUser = this.userService.currentJdrUser();
    if (!currentUser) return;
    this.subscription = this.notificationService.subscribeToModuleAccessUpdates(
      moduleId,
      (accessUpdate) => {
        if (accessUpdate.access.user.id === currentUser.id) {
          this.moduleService.updateModuleAccess(accessUpdate.access);
        }
      }
    );
  }

  selectDefaultVersionAndUpdateURL() {
    const module = this.currentModule();
    if (module && module.versions && module.versions.length > 0) {
      const defaultVersion = module.versions.sort((a,b) => (b.version || 0) - (a.version || 0))[0];
      this.moduleService.currentModuleVersion.set(defaultVersion);
      if (module.id && defaultVersion.id) {
        this.router.navigate([], {
          relativeTo: this.route, queryParams: { versionId: defaultVersion.id },
          queryParamsHandling: 'merge', replaceUrl: true,
        });
      }
    }
  }

  updateCurrentVersion(version: ModuleVersion) {
    this.moduleService.currentModuleVersion.set(version);
    if (version.id) {
      this.router.navigate([], {
        relativeTo: this.route, queryParams: { versionId: version.id },
        queryParamsHandling: 'merge', replaceUrl: true,
      });
    }
  }

  private async initializeLockAndConflicts() {
    const module = this.currentModule();
    const version = this.currentVersion();
    if (module && module.id !== 0 && version && version.id) {
        await this.attemptLockAcquisition();
        await this.fetchConflicts();
    } else if (module && module.id === 0) {
        this.isLockedByCurrentUser.set(true);
        this.lockStatusMessage.set("Nouveau module, édition activée.");
        this.activeConflicts.set([]);
    }
  }

  async attemptLockAcquisition() {
    const version = this.currentVersion();
    if (!version || !version.id || this.currentModule()?.id === 0) {
      this.isLockedByCurrentUser.set(this.currentModule()?.id === 0);
      this.lockStatusMessage.set(this.currentModule()?.id === 0 ? "Nouveau module, édition activée." : "Version non spécifiée pour le verrouillage.");
      return;
    }
    this.isLoadingLock.set(true);
    this.lockStatusMessage.set("Tentative de verrouillage...");
    const lockRequest: LockAcquisitionRequestDTO = {
      resourceType: ResourceType.MODULE_VERSION, resourceId: version.id, durationMinutes: 30
    };
    try {
      const result: LockResult = await this.lockService.acquireLock(lockRequest);
      if (result.acquired && result.lockToken) {
        this.currentLockToken.set(result.lockToken);
        this.isLockedByCurrentUser.set(true);
        this.lockStatusMessage.set(result.expiresAt ? `Verrouillage acquis. Expire à ${this.datePipe.transform(result.expiresAt, 'mediumTime', '', 'fr-FR')}` : 'Verrouillage acquis.');
        this.startLockRenewal();
      } else {
        this.isLockedByCurrentUser.set(false);
        this.currentLockToken.set(null);
        this.lockStatusMessage.set(result.message || "Impossible d'acquérir le verrou.");
        if (result.conflictingLock) {
          this.lockStatusMessage.set(`Verrouillé par ${result.conflictingLock.lockedBy.username} jusqu'à ${this.datePipe.transform(result.conflictingLock.expiresAt, 'mediumTime', '', 'fr-FR')}`);
        }
      }
    } catch (error: any) {
      this.isLockedByCurrentUser.set(false);
      this.currentLockToken.set(null);
      this.lockStatusMessage.set(`Erreur d'acquisition: ${error.error?.message || error.message || 'Inconnue'}`);
      console.error("Error acquiring lock:", error);
    } finally {
      this.isLoadingLock.set(false);
    }
  }

  private lockRenewalInterval: ReturnType<typeof setInterval> | null = null;
  private startLockRenewal() {
    this.clearLockRenewal();
    this.lockRenewalInterval = setInterval(async () => {
      if (this.currentLockToken()) {
        try {
          const renewalResult = await this.lockService.renewLock(this.currentLockToken()!, 15);
          if (renewalResult.renewed && renewalResult.lockToken) {
            this.currentLockToken.set(renewalResult.lockToken);
            this.lockStatusMessage.set(renewalResult.expiresAt ? `Verrouillage renouvelé. Expire à ${this.datePipe.transform(renewalResult.expiresAt, 'mediumTime', '', 'fr-FR')}`: 'Verrouillage renouvelé.');
          } else {
            this.lockStatusMessage.set(`Échec renouvellement: ${renewalResult.message}. Mode lecture seule.`);
            this.isLockedByCurrentUser.set(false); this.clearLockRenewal();
          }
        } catch (error: any) {
          this.lockStatusMessage.set(`Erreur renouvellement: ${error.message}. Mode lecture seule.`);
          this.isLockedByCurrentUser.set(false); this.clearLockRenewal();
          console.error("Error renewing lock:", error);
        }
      } else { this.clearLockRenewal(); }
    }, 10 * 60 * 1000); // 10 minutes
  }

  private clearLockRenewal() {
    if (this.lockRenewalInterval) {
      clearInterval(this.lockRenewalInterval);
      this.lockRenewalInterval = null;
    }
  }

  async releaseCurrentLock() {
    if (this.currentLockToken()) {
      try {
        await this.lockService.releaseLock(this.currentLockToken()!);
        this.currentLockToken.set(null); this.isLockedByCurrentUser.set(false);
        this.lockStatusMessage.set("Verrouillage libéré."); this.clearLockRenewal();
      } catch (error: any) {
        this.lockStatusMessage.set(`Erreur libération: ${error.message}`);
        console.error("Error releasing lock:", error);
      }
    }
  }

  async fetchConflicts() {
    const moduleId = this.currentModule()?.id;
    const versionId = this.currentVersion()?.id;
    if (!moduleId || moduleId === 0 || !versionId) {
      this.activeConflicts.set([]); return;
    }
    this.isLoadingConflicts.set(true);
    try {
      const conflicts = await this.conflictService.getActiveConflicts();
      this.activeConflicts.set(
        conflicts.filter(c =>
          (c.resourceType === ResourceType.MODULE && c.resourceId === moduleId) ||
          (c.resourceType === ResourceType.MODULE_VERSION && c.resourceId === versionId) ||
          (c.resourceType === ResourceType.BLOCK && this.blocks()?.some(b => b.id === c.resourceId))
        )
      );
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Erreur Conflits', detail: `Chargement conflits échoué: ${error.message}` });
      this.activeConflicts.set([]);
    } finally {
      this.isLoadingConflicts.set(false);
    }
  }

  async save() {
    const module = this.currentModule();
    const version = this.currentVersion();
    if (!module || !module.creator || !version) {
      this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Données module/utilisateur manquantes.' });
      return;
    }
    if (this.isEffectivelyReadOnly()) {
       this.messageService.add({ severity: 'warn', summary: 'Lecture Seule', detail: this.lockStatusMessage() || 'Modifications non sauvegardées.' });
       return;
    }
    this.loadingSave.set(true);
    if (this.currentGameSystem()) version.gameSystemId = this.currentGameSystem()!.id;

    // Ensure blocks have correct moduleVersionId if it's a new version from an existing module
    if (version.id && module.id !== 0 && version.blocks) {
        version.blocks.forEach(block => {
            if (block.moduleVersionId === 0 || block.moduleVersionId !== version.id) {
                block.moduleVersionId = version.id!;
            }
        });
    }


    const moduleRequest = new ModuleRequest(
      module.title, module.description, module.isTemplate, module.type,
      module.creator!, module.picture, [version], module.accesses // Send only the current version for update
    );
    try {
      if (module.id === 0) { // Create new module
        const createdModule = await this.moduleHttpService.createModule(moduleRequest);
        this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Module créé !' });
        this.moduleService.setCurrentModule(createdModule);

        // The createdModule from backend should have the definitive IDs for version and blocks
        const createdVersion = createdModule.versions.find(v => v.version === 1); // Or however the backend returns the new version
        this.moduleService.currentModuleVersion.set(createdVersion || createdModule.versions[0]);

        this.router.navigate(['/module', createdModule.id], {
           replaceUrl: true, queryParams: { versionId: this.moduleService.currentModuleVersion()?.id }
        });
        await this.attemptLockAcquisition(); // Lock after creation and navigation
      } else { // Update existing module/version
        const smartUpdateResult = await this.conflictService.smartUpdateModuleVersion(version.id!, version);
        if (smartUpdateResult.success) {
          this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Module mis à jour !' });
          // smartUpdateResult.data might be the updated ModuleVersion or full Module
          // It's often safer to reload to ensure all data is fresh and consistent
          await this.moduleService.loadModuleById(module.id!);
          // Ensure the current version reflects the saved one, especially if IDs changed (new blocks)
           const reloadedModule = this.moduleService.currentModule();
           if (reloadedModule) {
               const updatedVersionFromServer = reloadedModule.versions.find(v => v.id === version.id);
               if (updatedVersionFromServer) {
                   this.moduleService.currentModuleVersion.set(updatedVersionFromServer);
               }
           }

        } else if (smartUpdateResult.type === 'CONFLICT' && smartUpdateResult.conflict) {
          this.messageService.add({ severity: 'warn', summary: 'Conflit Détecté', detail: 'Veuillez résoudre les conflits.' });
          this.activeConflicts.update(conflicts => {
            // Avoid adding duplicate conflicts
            if (!conflicts.some(c => c.conflictId === smartUpdateResult.conflict!.conflictId)) {
              return [...conflicts, smartUpdateResult.conflict!];
            }
            return conflicts;
          });
          // Lock is maintained by default for conflict resolution
        } else {
          this.messageService.add({ severity: 'error', summary: 'Erreur', detail: smartUpdateResult.errorMessage || 'Mise à jour échouée.' });
        }
      }
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Erreur Sauvegarde', detail: `${error.error?.message || error.message}` });
    } finally {
      this.loadingSave.set(false);
    }
  }


  startIconDrag(event: { event: Event; blockType: EBlockType }) {
    if (this.isDraggingIcon() || this.isEffectivelyReadOnly()) return;
    // ... (rest of startIconDrag logic remains the same)
    let clientX = 0, clientY = 0;
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
      this.activeIconElement = (event.event.target as HTMLElement).closest('.icon-item');
      this.activeIconElement?.classList.add('active-drag');
    }
  }

  getBlockPreview(type: EBlockType): string | undefined {
    switch (type) {
      case EBlockType.paragraph: return 'Paragraphe';
      case EBlockType.music: return 'Audio';
      case EBlockType.module: return 'Module';
      case EBlockType.stat: return 'Statistique';
      case EBlockType.picture: return 'Image';
      default: return undefined;
    }
  }

  generateAIContent(data: { blockId: number; blockType: string }) {
    if (this.isEffectivelyReadOnly()) return;
    this.dialogService.open(AiConfigComponent, {
        showHeader: false, width: '60rem', modal: true,
        data: { type: data.blockType } // Pass data correctly using 'data' property
      }).onClose.subscribe((response: string) => {
        if (response && response.length > 0) this.processAIResponse(data.blockId, data.blockType, response);
      });
  }

  processAIResponse(blockId: number, blockType: string, response: string) {
    const currentVersionVal = this.currentVersion();
    if (!currentVersionVal || !currentVersionVal.blocks) return;

    const blockIndex = currentVersionVal.blocks.findIndex(b => b.id === blockId);
    if (blockIndex === -1) return;

    let blockToUpdate = { ...currentVersionVal.blocks[blockIndex] };

    if (blockType === EBlockType.paragraph && blockToUpdate instanceof ParagraphBlock) {
      (blockToUpdate as ParagraphBlock).paragraph = response;
    } else if (blockType === EBlockType.stat && blockToUpdate instanceof StatBlock) {
       try {
        const statData = JSON.parse(response);
        (blockToUpdate as StatBlock).statRules = statData.statRules || '';
        (blockToUpdate as StatBlock).statValues = statData.statValues || '';
      } catch (e) {
        console.error("Erreur parsing JSON pour StatBlock:", e);
        this.messageService.add({severity: 'error', summary: 'Erreur IA', detail: 'Réponse IA pour statistiques mal formatée.'});
        return;
      }
    } else if (blockType === EBlockType.music && blockToUpdate instanceof MusicBlock) {
       try {
        const musicData = JSON.parse(response);
        (blockToUpdate as MusicBlock).label = musicData.label || blockToUpdate.title;
        (blockToUpdate as MusicBlock).src = musicData.src || '';
      } catch (e) {
        console.error("Erreur parsing JSON pour MusicBlock:", e);
        this.messageService.add({severity: 'error', summary: 'Erreur IA', detail: 'Réponse IA pour musique mal formatée.'});
        return;
      }
    }
    // Important: Update signals by creating new arrays/objects to trigger change detection
    this.moduleService.currentModuleVersion.update(cv => {
        if (!cv || !cv.blocks) return cv;
        const updatedBlocks = [...cv.blocks];
        updatedBlocks[blockIndex] = blockToUpdate;
        return { ...cv, blocks: updatedBlocks };
    });
     this.moduleService.currentModule.update(mod => {
        if (!mod) return null;
        const versionIndex = mod.versions.findIndex(v => v.id === currentVersionVal.id);
        if (versionIndex !== -1) {
            const updatedVersions = [...mod.versions];
            // Ensure we are using the most up-to-date version from the signal
            const latestVersionFromSignal = this.moduleService.currentModuleVersion();
            if (latestVersionFromSignal) {
                 updatedVersions[versionIndex] = latestVersionFromSignal;
            }
            return { ...mod, versions: updatedVersions };
        }
        return mod;
    });
  }

  generateCompleteModule() {
    if (this.isEffectivelyReadOnly()) return;
    this.ref = this.dialogService.open(AiConfigComponent, {
      showHeader: false, width: '70rem', modal: true,
      data: { type: 'module' } // Pass data using 'data' for DynamicDialog
    });
    this.ref.onClose.subscribe((response: string) => {
      if (!response || response.length === 0) return;
      try {
        const moduleData = JSON.parse(response);
        this.currentModule.update((module) => {
          if (module) {
            return { ...module, title: moduleData.title || module.title, description: moduleData.description || module.description };
          } return null;
        });
        if (moduleData.blocks && Array.isArray(moduleData.blocks)) {
          const newBlocks: Block[] = [];
          moduleData.blocks.forEach((block: any, index: number) => { // Use any for block from AI for flexibility
            const module = this.currentModule();
            if (module && this.currentUser()) {
              let newBlockInstance: Block | null = null;
              switch (block.type) {
                case EBlockType.paragraph:
                  newBlockInstance = new ParagraphBlock(module.id || 0, block.title || 'Paragraphe', index, this.currentUser()!, block.paragraph || '', block.style || 'narrative');
                  break;
                case EBlockType.music:
                  newBlockInstance = new MusicBlock(module.id || 0, block.title || 'Musique', index, this.currentUser()!, block.label || block.title, block.src || '');
                  break;
                case EBlockType.stat:
                  newBlockInstance = new StatBlock(module.id || 0, block.title || 'Statistiques', index, this.currentUser()!, block.statRules || '', block.statValues || '');
                  break;
              }
              if (newBlockInstance) {
                newBlockInstance.id = Date.now() + Math.random() + index; // Temp client-side ID
                newBlocks.push(newBlockInstance);
              }
            }
          });
          this.moduleService.currentModuleVersion.update(cv => {
            if (!cv) return undefined;
            return {...cv, blocks: newBlocks};
          });
        }
        this.messageService.add({ severity: 'success', summary: 'Génération IA', detail: 'Module généré!' });
      } catch (e) {
        console.error('Erreur parsing réponse IA module:', e);
        this.messageService.add({ severity: 'error', summary: 'Erreur IA', detail: "Réponse IA mal formatée." });
      }
    });
  }

  deleteModule() {
    if (this.isEffectivelyReadOnly()) return;
    const module = this.currentModule();
    if (module && module.id !== 0) {
      this.confirmationService.confirm({
        message: 'Étes-vous sûr de vouloir supprimer ce module ?',
        header: 'Confirmation', closable: true, closeOnEscape: true,
        icon: 'pi pi-exclamation-triangle',
        rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
        acceptButtonProps: { label: 'Confirmer', severity: 'danger' },
        accept: () => { if (this.currentModule()?.id) this.acceptDelete(this.currentModule()!.id); },
      });
    } else {
      this.messageService.add({ severity: 'info', summary: 'Info', detail: 'Module non sauvegardé, suppression impossible.' });
    }
  }

  async acceptDelete(moduleId: number) {
    this.messageService.clear('confirmDelete');
    if (!moduleId) return;
    try {
      await this.moduleHttpService.deleteModule(moduleId);
      this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Module supprimé.' });
      await this.releaseCurrentLock(); // Release lock before navigating
      this.moduleService.clearCurrentModule();
      this.router.navigate(['/projects']);
    } catch (error) {
      console.error(`Erreur suppression module ${moduleId}:`, error);
      this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Suppression module échouée.' });
    }
  }

  openConflictResolutionDialog(conflict: ConflictDTO) {
    if (this.isEffectivelyReadOnly()) {
        this.messageService.add({severity: 'info', summary: 'Lecture Seule', detail: 'Résolution impossible sans verrou.'});
        return;
    }
    console.log("Ouverture dialogue résolution pour conflit:", conflict.conflictId);
    // Placeholder for actual dialog component opening
    // Example:
    // this.dialogService.open(ConflictResolutionDialogComponent, {
    //   data: { conflict },
    //   header: `Résoudre le Conflit: ${conflict.description}`,
    //   width: '70vw',
    // }).onClose.subscribe((resolutionData?: { fieldResolutions: FieldResolutionDTO[] }) => {
    //   if (resolutionData && resolutionData.fieldResolutions) {
    //     this.resolveConflict(conflict, resolutionData.fieldResolutions);
    //   }
    // });
     this.messageService.add({severity: 'info', summary: 'Fonctionnalité en cours', detail: 'La résolution de conflit sera bientôt disponible.'});
  }

 async resolveConflict(conflict: ConflictDTO, resolutions: FieldResolutionDTO[]) {
    if (this.isEffectivelyReadOnly()) return;
    const request: ConflictResolutionRequestDTO = {
      conflictId: conflict.conflictId,
      resolutionStrategy: 'manual', // Or 'auto' based on UI
      fieldResolutions: resolutions,
    };
    try {
      const result = await this.conflictService.resolveConflict(conflict.conflictId, request);
      if (result.success) {
        this.messageService.add({ severity: 'success', summary: 'Conflit Résolu', detail: 'Le conflit a été résolu.' });
        this.activeConflicts.update(conflicts => conflicts.filter(c => c.conflictId !== conflict.conflictId));
        // It's crucial to reload the module data to reflect the resolved state from the server
        await this.moduleService.loadModuleById(this.currentModule()!.id!);
      } else {
        this.messageService.add({ severity: 'error', summary: 'Erreur Résolution', detail: result.errorMessage || 'La résolution a échoué.' });
      }
    } catch (error: any) {
      this.messageService.add({ severity: 'error', summary: 'Erreur Résolution', detail: `Échec: ${error.message}` });
    }
  }
}
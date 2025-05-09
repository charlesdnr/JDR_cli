import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TabsModule } from 'primeng/tabs';
import {
  DragDropModule,
} from '@angular/cdk/drag-drop';
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
import { BlockHttpService } from '../../services/https/block-http.service';
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
  ],
  providers: [ConfirmationService],
  templateUrl: './new-project.component.html',
  styleUrl: './new-project.component.scss',
})
export class NewProjectComponent implements OnInit, OnDestroy {
  private moduleService = inject(ModuleService);
  private userService = inject(UserHttpService);
  private blockHttpService = inject(BlockHttpService);
  private moduleHttpService = inject(ModuleHttpService);
  public dialogService = inject(DialogService);
  public confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  currentModule = this.moduleService.currentModule;
  loadingModuleState = this.moduleService.loadingModule;
  currentUser = computed(() => this.userService.currentJdrUser());
  currentGameSystem = signal<GameSystem | undefined>(undefined);
  currentVersion = this.moduleService.currentModuleVersion;
  blocks = computed(() => this.currentVersion()?.blocks)

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

  ngOnInit() {
    this.initializeAvailableBlocks();

    // Combinaison des paramètres de route et de requête
    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      const moduleIdParam = params.get('moduleId');

      if (moduleIdParam) {
        const moduleId = parseInt(moduleIdParam, 10);
        if (!isNaN(moduleId)) {
          // Chargement du module
          this.moduleService.loadModuleById(moduleId).then(() => {
            // Une fois le module chargé, récupérer le paramètre de requête versionId
            this.route.queryParamMap.subscribe(queryParams => {
              const versionIdParam = queryParams.get('versionId');
              const module = this.currentModule();

              if (versionIdParam && module) {
                const versionId = parseInt(versionIdParam, 10);
                const selectedVersion = module.versions.find(v => v.id === versionId);

                if (selectedVersion) {
                  // Si la version spécifiée existe, la définir comme courante
                  this.moduleService.currentModuleVersion.set(selectedVersion);
                } else {
                  // Si la version spécifiée n'existe pas, sélectionner la première par défaut
                  this.selectDefaultVersionAndUpdateURL();
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
        this.router.navigate(
          [],
          {
            relativeTo: this.route,
            queryParams: { versionId: defaultVersion.id },
            queryParamsHandling: 'merge', // préserve les autres paramètres
            replaceUrl: true
          }
        );
      }
    }
  }

  updateCurrentVersion(version: ModuleVersion) {
    this.moduleService.currentModuleVersion.set(version);

    // Mise à jour de l'URL pour refléter la nouvelle version sélectionnée
    if (version.id) {
      this.router.navigate(
        [],
        {
          relativeTo: this.route,
          queryParams: { versionId: version.id },
          queryParamsHandling: 'merge',
          replaceUrl: true
        }
      );
    }
  }

  ngOnDestroy() {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
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
        new IntegratedModuleBlock(
          tempModuleVersionId,
          'Preview Module Intégré',
          3,
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

    const moduleRequest = new ModuleRequest(
      module.title,
      module.description,
      module.isTemplate,
      module.type,
      module.creator!,
      module.picture,
      module.versions,
      module.accesses
    );

    try {
      let savedModule: Module;
      if (module.id === 0) {
        // Création
        savedModule = await this.moduleHttpService.createModule(moduleRequest);
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Module créé avec succès !',
        });
        this.moduleService.setCurrentModule(savedModule);
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
    console.log(blockId);
    console.log(blockType);
    console.log(response);
    console.log(
      this.currentVersion()?.blocks.find((block) => block.id === blockId)
    );
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

      console.log(this.currentVersion()?.blocks);
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
        console.log('Module data received:', moduleData);

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
          if(this.currentModule()?.id)
            this.acceptDelete(this.currentModule()!.id)
        }
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
}

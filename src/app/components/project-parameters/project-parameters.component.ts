import {
  Component,
  computed,
  inject,
  input,
  model,
  OnInit,
  output,
  signal,
  WritableSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TranslateModule } from '@ngx-translate/core';
import { GameSystem } from '../../classes/GameSystem';
import { UserAvatarChooseComponent } from '../../components/user-avatar-choose/user-avatar-choose.component';
import { DialogService } from 'primeng/dynamicdialog';
import { User } from '../../classes/User';
import { TooltipModule } from 'primeng/tooltip';
import { Module } from '../../classes/Module';
import { UserFolderHttpService } from '../../services/https/user-folder-http.service';
import { UserSavedModuleHttpService } from '../../services/https/user-saved-module-http.service';
import { UserFolder } from '../../classes/UserFolder';
import { MessageService, TreeNode } from 'primeng/api';
import { UserSavedModule } from '../../classes/UserSavedModule';
import { ModuleVersion } from '../../classes/ModuleVersion';
import { ModuleVersionHttpService } from '../../services/https/module-version-http.service';
import { ModuleService } from '../../services/module.service';
import { GameSystemHttpService } from '../../services/https/game-system-http.service';
import { ActivatedRoute, Router } from '@angular/router';
import { TreeSelectModule } from 'primeng/treeselect';

@Component({
  selector: 'app-project-parameters',
  imports: [
    FormsModule,
    ButtonModule,
    SelectModule,
    InputTextModule,
    TextareaModule,
    TranslateModule,
    UserAvatarChooseComponent,
    TooltipModule,
    TreeSelectModule
  ],
  templateUrl: './project-parameters.component.html',
  styleUrl: './project-parameters.component.scss',
})
export class ProjectParametersComponent implements OnInit {
  private dialogService = inject(DialogService);
  private messageService = inject(MessageService);
  private httpUserFolderService = inject(UserFolderHttpService);
  private httpUserSavedModuleService = inject(UserSavedModuleHttpService);
  private httpModuleVersionService = inject(ModuleVersionHttpService);
  private moduleService = inject(ModuleService);
  private gameSystemHttpService = inject(GameSystemHttpService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Inputs
  currentModule = input.required<Module>();
  currentVersion = model.required<ModuleVersion>();
  versions = computed(() => this.currentModule().versions)
  gameSystems = signal<GameSystem[]>([]);

  currentUser = input<User | null>(null);
  loadingSave = input<boolean>(false);
  loadingPublished = signal<boolean>(false);

  // Models
  currentGameSystem = model<GameSystem | undefined>(undefined);
  needToCreate = computed(() => this.currentModule()?.id === 0);

  // Outputs
  saveRequested = output<void>();
  generateModuleRequested = output<void>();
  deleteRequested = output<void>();
  versionUpdated = output<ModuleVersion>();

  foldersName = computed(() => this.folders().map((folder) => folder.name));
  folders: WritableSignal<UserFolder[]> = signal([]);
  selectedFolder = signal<TreeNode | null>(null);

  gameLoading = false;
  folderLoading = false;

  treeNode = computed<TreeNode[]>(() => {
    const nodes: TreeNode[] = [];
    const folderMap = new Map<number, TreeNode>();
    const rootFolders: UserFolder[] = [];
    let childFolders: UserFolder[] = [];

    // Première passe: séparer les dossiers racines et les enfants
    this.folders().forEach(folder => {
      if (!folder.parentFolder) {
        rootFolders.push(folder);
      } else {
        childFolders.push(folder);
      }
    });

    // Créer les nœuds racines
    rootFolders.forEach(folder => {
      const node: TreeNode = {
        key: folder.folderId?.toString() || '',
        label: folder.name || 'Sans nom',
        data: folder,
        icon: 'pi pi-folder',
        children: [],
        selectable: true,
        expanded: false
      };

      nodes.push(node);
      if (folder.folderId) {
        folderMap.set(folder.folderId, node);
      }
    });

    // Ajouter les enfants de manière récursive
    const addChildren = () => {
      let remainingChildren = [...childFolders];
      let processedAny = false;

      childFolders.forEach(folder => {
        if (folder.parentFolder && folderMap.has(folder.parentFolder)) {
          const parentNode = folderMap.get(folder.parentFolder);
          if (parentNode) {
            const childNode: TreeNode = {
              key: folder.folderId?.toString() || '',
              label: folder.name || 'Sans nom',
              data: folder,
              icon: 'pi pi-folder',
              children: [],
              parent: parentNode,
              selectable: true,
              expanded: false
            };

            if (!parentNode.children) {
              parentNode.children = [];
            }

            parentNode.children.push(childNode);

            if (folder.folderId) {
              folderMap.set(folder.folderId, childNode);
            }

            // Supprimer ce dossier de la liste des enfants restants
            remainingChildren = remainingChildren.filter(f => f !== folder);
            processedAny = true;
          }
        }
      });

      // Si nous avons ajouté des enfants, et qu'il reste des enfants à traiter,
      // continue jusqu'à ce que tous soient traités ou qu'aucun ne puisse être ajouté
      if (processedAny && remainingChildren.length > 0) {
        childFolders = remainingChildren;
        addChildren();
      }
    };

    // Lancer le processus d'ajout des enfants
    addChildren();
    console.log(nodes)
    return nodes;
  });

  async ngOnInit(): Promise<void> {
    await this.loadFolders();
    this.findInUserSavedModule();
    try {
      this.gameLoading = true
      const systems = await this.gameSystemHttpService.getAllGameSystems();
      this.gameSystems.set(systems);
      const defaultGameSystem = systems.length > 0 ? systems[0] : undefined;
      this.currentGameSystem.set(defaultGameSystem);
    } catch (error) {
      console.error('Error loading game systems:', error);
    } finally {
      this.gameLoading = false;
    }
  }

  save(): void {
    this.saveRequested.emit();
  }

  generateCompleteModule(): void {
    this.generateModuleRequested.emit();
  }

  /**
   * Charge les dossiers de l'utilisateur
   */
  async loadFolders(): Promise<UserFolder[]> {
    // this.isLoadingFolders.set(true);
    try {
      this.folderLoading = true;
      const user = this.currentUser();
      if (!user) return [];
      const fetchedFolders = await this.httpUserFolderService.getAllUserFolders(
        user.id
      );
      this.folders.set(fetchedFolders);
      return fetchedFolders;
    } catch (error: unknown) {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur Dossiers',
        detail: 'Impossible de charger les dossiers.' + error,
      });
      return [];
    } finally {
      this.folderLoading = false;
    }
  }

  findInUserSavedModule() {
    const user = this.currentUser();
    if (user) {
      this.httpUserSavedModuleService
        .getAllUserSavedModules(user.id)
        .then((savedModules: UserSavedModule[]) => {
          const savMod = savedModules.find(
            (save) =>
              save.moduleId === this.currentModule().id &&
              save.moduleVersionId == this.currentVersion().id
          );
          if (savMod && savMod.folderId) {
            this.httpUserFolderService.getUserFolderById(savMod.folderId).then(folder => {
              // Utiliser une fonction de recherche récursive au lieu de find()
              const foundNode = this.findNodeRecursively(this.treeNode(), folder.folderId ?? 0);
              console.log(foundNode);
              if (foundNode) {
                this.selectedFolder.set(foundNode);
                console.log(this.selectedFolder());
              }
            });
          }
        });
    }
  }


  findNodeRecursively(nodes: TreeNode[], folderId: number): TreeNode | null {
    // Parcourir tous les nœuds du niveau actuel
    for (const node of nodes) {
      // Vérifier si le nœud actuel correspond
      if (node.key === folderId.toString()) {
        return node;
      }

      // Si le nœud a des enfants, rechercher récursivement dans ses enfants
      if (node.children && node.children.length > 0) {
        const foundInChildren = this.findNodeRecursively(node.children, folderId);
        if (foundInChildren) {
          return foundInChildren;
        }
      }
    }

    // Si aucun nœud correspondant n'est trouvé
    return null;
  }

  saveFolder() {
    this.folderLoading = true;
    const user = this.currentUser();
    const currentModuleId = this.currentModule().id;
    const currentVersionId = this.currentModule().versions[0].id!;

    // D'abord, récupérer TOUS les modules sauvegardés de l'utilisateur
    this.httpUserSavedModuleService.getAllUserSavedModules(user!.id)
      .then((allUserSavedModules: UserSavedModule[]) => {
        // Trouver toutes les associations existantes pour ce module/version
        const existingModuleAssociations = allUserSavedModules.filter(
          (save) => save.moduleId === currentModuleId &&
            save.moduleVersionId === currentVersionId
        );

        // Si des associations existantes sont trouvées dans d'autres dossiers que celui sélectionné
        const promises: Promise<any>[] = [];

        existingModuleAssociations.forEach(association => {
          // Si l'association n'est pas avec le dossier actuellement sélectionné
          if (association.folderId !== this.selectedFolder()!.data.folderId) {
            // Supprimer cette association
            promises.push(
              this.httpUserSavedModuleService.delete(association.savedModuleId!)
            );
          }
        });

        // Après avoir supprimé les anciennes associations, vérifier si une association
        // existe déjà dans le dossier sélectionné
        return Promise.all(promises).then(() => {
          const existingInSelectedFolder = existingModuleAssociations.find(
            association => association.folderId === this.selectedFolder()!.data.folderId
          );

          if (existingInSelectedFolder) {
            // Mettre à jour l'association existante
            return this.httpUserSavedModuleService.put(
              new UserSavedModule(
                user!.id,
                currentModuleId,
                currentVersionId,
                this.selectedFolder()!.data.folderId!,
                '',
                0
              ),
              existingInSelectedFolder.savedModuleId!
            );
          } else {
            // Créer une nouvelle association
            return this.httpUserSavedModuleService.post(
              new UserSavedModule(
                user!.id,
                currentModuleId,
                currentVersionId,
                this.selectedFolder()!.data.folderId!,
                '',
                0
              )
            );
          }
        });
      })
      .then(() => {
        this.messageService.add({
          severity: 'success',
          summary: 'Dossiers',
          detail: 'Le Module fait maintenant partie du dossier ' + this.selectedFolder()?.data.name
        });
      })
      .catch(error => {
        console.error('Erreur lors de la mise à jour du dossier:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de mettre à jour le dossier'
        });
      })
      .finally(() => this.folderLoading = false);
  }



  createNewVersion() {
    this.httpModuleVersionService.createModuleVersion(
      this.currentModule().id,
      new ModuleVersion(
        this.currentModule().id,
        this.currentModule().versions.length + 1,
        this.currentUser()!,
        this.currentGameSystem()!.id!,
        false
      )
    ).then(async (newVersion) => {
      // Rafraîchir le module
      await this.moduleService.refreshCurrentModule();

      // Obtenir le module mis à jour et la nouvelle version
      const updatedModule = this.moduleService.currentModule();
      if (updatedModule) {
        // Trouver la nouvelle version
        const latestVersion = updatedModule.versions.find(v => v.id === newVersion.id) ||
          updatedModule.versions[updatedModule.versions.length - 1];

        // Mettre à jour directement via le service
        this.moduleService.currentModuleVersion.set(latestVersion);

        // Mettre à jour aussi l'URL directement
        this.router.navigate(
          [],
          {
            relativeTo: this.route,
            queryParams: { versionId: latestVersion.id },
            queryParamsHandling: 'merge',
            replaceUrl: true
          }
        );

        // Message de succès
        this.messageService.add({
          severity: 'success',
          summary: 'Nouvelle version',
          detail: 'La nouvelle version a été créée et sélectionnée'
        });
      }
    }).catch(error => {
      console.error('Erreur lors de la création de la version:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Impossible de créer la nouvelle version'
      });
    });
  }

  published() {
    this.currentVersion().published = !this.currentVersion().published
    this.loadingPublished.set(true);
    this.httpModuleVersionService.updateModuleVersion(this.currentVersion().id!, this.currentVersion())
      .then(() => {
        if (this.currentVersion().published) {
          this.messageService.add({ severity: 'success', summary: 'Version', detail: 'La version a été publiée' })
        } else {
          this.messageService.add({ severity: 'success', summary: 'Version', detail: 'La version a été rendu privée' })
        }
      })
      .finally(() => this.loadingPublished.set(false))
  }
}

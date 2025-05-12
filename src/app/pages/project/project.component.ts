import {
  Component,
  inject,
  OnInit,
  signal,
  WritableSignal,
  computed,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataViewModule } from 'primeng/dataview';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ListboxModule } from 'primeng/listbox';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import {
  MenuItem,
  MessageService,
  TreeDragDropService,
  TreeNode,
} from 'primeng/api';
import { UserFolderHttpService } from '../../services/https/user-folder-http.service';
import { ModuleHttpService } from '../../services/https/module-http.service';
import { UserFolder } from '../../classes/UserFolder';
import { UserSavedModule } from '../../classes/UserSavedModule';
import { UserHttpService } from '../../services/https/user-http.service';
import { UserSavedModuleHttpService } from '../../services/https/user-saved-module-http.service';
import { DialogModule } from 'primeng/dialog';
import { FloatLabelModule } from 'primeng/floatlabel';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ModuleViewerComponent } from '../../components/module-viewer/module-viewer.component';
import {
  TreeModule,
  TreeNodeContextMenuSelectEvent,
  TreeNodeDropEvent,
  TreeNodeSelectEvent,
} from 'primeng/tree';
import { ContextMenuModule } from 'primeng/contextmenu';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Module } from '../../classes/Module';
import { ModuleService } from '../../services/module.service';
import { DragDropModule } from 'primeng/dragdrop';

interface DisplayableSavedModule extends UserSavedModule {
  moduleDetails?: Module;
  isLoadingDetails?: boolean;
}

@Component({
  selector: 'app-project',
  standalone: true,
  imports: [
    FormsModule,
    DataViewModule,
    CardModule,
    ButtonModule,
    ListboxModule,
    InputTextModule,
    ToastModule,
    ProgressSpinnerModule,
    DialogModule,
    FloatLabelModule,
    IconFieldModule,
    InputIconModule,
    ModuleViewerComponent,
    TreeModule,
    ContextMenuModule,
    RouterLink,
    DragDropModule,
  ],
  providers: [TreeDragDropService],
  templateUrl: './project.component.html',
  styleUrls: ['./project.component.scss'],
})
export class ProjectComponent implements OnInit {
  private httpUserFolderService = inject(UserFolderHttpService);
  private httpUserService = inject(UserHttpService);
  private httpUserSavedModuleService = inject(UserSavedModuleHttpService);
  private moduleHttpService = inject(ModuleHttpService);
  private moduleService = inject(ModuleService);
  private messageService = inject(MessageService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  currentUser = computed(() => this.httpUserService.currentJdrUser());

  // --- Signals pour l'état ---
  folders: WritableSignal<UserFolder[]> = signal([]);
  selectedFolder: WritableSignal<TreeNode | null> = signal(null);

  displayedModules: WritableSignal<DisplayableSavedModule[]> = signal([]);
  moduleWithoutFolder = signal<DisplayableSavedModule[]>([]);

  isLoadingFolders = signal(false);
  isLoadingModules = signal(false);
  searchValue = signal('');
  draggedModule: DisplayableSavedModule | null = null;

  contextMenuItems: MenuItem[] = [
    {
      label: 'Nouveau sous-dossier',
      icon: 'pi pi-fw pi-plus',
      command: () => this.showNewFolderDialog(this.selectedNode),
    },
    {
      label: 'Renommer',
      icon: 'pi pi-fw pi-pencil',
      command: () => this.renameFolder(this.selectedNode),
    },
    {
      label: 'Supprimer',
      icon: 'pi pi-fw pi-trash',
      command: () => this.deleteFolder(this.selectedNode),
    },
  ];
  selectedNode: TreeNode | null = null;
  dialogTitle = 'Nouveau Dossier';
  dialogAction: 'create' | 'rename' = 'create';
  parentNode: TreeNode | null = null;
  selectedNodeForRename: TreeNode | null = null;

  treeNode = computed<TreeNode[]>(() => {
    const nodes: TreeNode[] = [];
    const folderMap = new Map<number, TreeNode>();
    const rootFolders: UserFolder[] = [];
    let childFolders: UserFolder[] = [];

    // Première passe: séparer les dossiers racines et les enfants
    this.folders().forEach((folder) => {
      if (!folder.parentFolder) {
        rootFolders.push(folder);
      } else {
        childFolders.push(folder);
      }
    });

    // Créer les nœuds racines
    rootFolders.forEach((folder) => {
      const node: TreeNode = {
        key: folder.folderId?.toString() || '',
        label: folder.name || 'Sans nom',
        data: folder,
        icon: 'pi pi-folder',
        children: [],
        selectable: true,
        expanded: false,
        droppable: true,
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

      childFolders.forEach((folder) => {
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
              expanded: false,
              droppable: true,
            };

            if (!parentNode.children) {
              parentNode.children = [];
            }

            parentNode.children.push(childNode);

            if (folder.folderId) {
              folderMap.set(folder.folderId, childNode);
            }

            // Supprimer ce dossier de la liste des enfants restants
            remainingChildren = remainingChildren.filter((f) => f !== folder);
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
    return nodes;
  });

  dialogVisible = false;
  folderName = '';

  async ngOnInit(): Promise<void> {
    await this.loadFolders();
    await this.loadModulesWithoutFolder();

    // Résoudre le problème de chargement des dossiers imbriqués
    this.route.queryParamMap.subscribe((queryParams) => {
      const folderIdQueryParam = queryParams.get('folderId');
      if (folderIdQueryParam) {
        this.findAndExpandToFolder(parseInt(folderIdQueryParam, 10));
      }
    });
  }

  // Nouvelle méthode pour trouver et développer jusqu'au dossier sélectionné
  findAndExpandToFolder(folderId: number): void {
    const pathToFolder: number[] = [];
    let targetFolder: UserFolder | undefined = undefined;

    // Trouver le dossier cible
    targetFolder = this.folders().find(
      (folder) => folder.folderId === folderId
    );

    if (!targetFolder) {
      return; // Dossier non trouvé
    }

    // Construire le chemin des dossiers parents
    let currentFolder: UserFolder | undefined = targetFolder;
    while (currentFolder) {
      if (currentFolder.folderId) {
        pathToFolder.unshift(currentFolder.folderId);
      }

      // Trouver le parent
      if (currentFolder.parentFolder) {
        currentFolder = this.folders().find(
          (folder) => folder.folderId === currentFolder?.parentFolder
        );
      } else {
        break; // Plus de parent
      }
    }

    // Développer et sélectionner le dossier
    this.expandAndSelectPath(pathToFolder);
  }

  // Méthode pour développer et sélectionner un chemin de dossiers
  expandAndSelectPath(folderIds: number[]): void {
    if (folderIds.length === 0) return;

    // Fonction récursive pour trouver et développer les nœuds
    const findAndExpandNode = (
      nodes: TreeNode[],
      index: number
    ): TreeNode | null => {
      for (const node of nodes) {
        if (node.data?.folderId === folderIds[index]) {
          // Si c'est le dernier ID dans le chemin, on le sélectionne
          if (index === folderIds.length - 1) {
            node.expanded = true;
            this.selectFolder(node);
            return node;
          }
          // Sinon, on développe ce nœud et on continue avec ses enfants
          else if (node.children && node.children.length > 0) {
            node.expanded = true;
            const foundNode = findAndExpandNode(node.children, index + 1);
            if (foundNode) return foundNode;
          }
        }
      }
      return null;
    };

    // Commencer la recherche à partir des nœuds racines
    findAndExpandNode(this.treeNode(), 0);
  }

  selectFolder(node: TreeNode): void {
    this.selectedFolder.set(node);
    if (node.data) {
      this.loadModulesForSelectedFolder(node.data);
    }
  }

  /**
   * Charge les dossiers de l'utilisateur
   */
  async loadFolders(): Promise<UserFolder[]> {
    this.isLoadingFolders.set(true);
    try {
      const user = this.currentUser();
      if (!user) return [];
      const fetchedFolders = await this.httpUserFolderService.getAllUserFolders(
        user.id
      );
      this.folders.set(fetchedFolders);

      // Après avoir chargé les dossiers, chargez les modules pour chaque dossier
      this.loadAllModulesForAllFolders(fetchedFolders);

      return fetchedFolders;
    } catch (error: unknown) {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur Dossiers',
        detail: 'Impossible de charger les dossiers.' + error,
      });
      return [];
    } finally {
      this.isLoadingFolders.set(false);
    }
  }

  async loadAllModulesForAllFolders(folders: UserFolder[]): Promise<void> {
    try {
      // Pour chaque dossier, charger ses modules et les ajouter à l'arbre
      for (const folder of folders) {
        if (folder.folderId) {
          // Récupérer les modules sauvegardés pour ce dossier
          const savedModules =
            await this.httpUserSavedModuleService.getSavedModulesByFolder(
              folder.folderId
            );

          // Enrichir chaque savedModule avec les détails du module
          const enrichedModules: DisplayableSavedModule[] = [];

          for (const savedModule of savedModules) {
            const moduleDetails = await this.moduleHttpService.getModuleById(
              savedModule.moduleId
            );
            enrichedModules.push({
              ...savedModule,
              moduleDetails: moduleDetails,
            });
          }

          // Ajouter les modules enrichis à l'arbre
          this.addModulesToTreeNode(folder.folderId, enrichedModules);
        }
      }
    } catch (error) {
      console.error(
        'Erreur lors du chargement des modules pour tous les dossiers:',
        error
      );
    }
  }

  /**
   * Charge les modules sauvegardés en fonction du dossier sélectionné
   */
  async loadModulesForSelectedFolder(folder: UserFolder): Promise<void> {
    this.isLoadingModules.set(true);
    try {
      const user = this.currentUser();
      if (!user) return;
      const folderId = folder?.folderId;
      if (!folderId) return;

      // Récupérer les modules sauvegardés
      const savedModules =
        await this.httpUserSavedModuleService.getSavedModulesByFolder(folderId);

      // Enrichir chaque savedModule avec les détails du module
      const enrichedModules: DisplayableSavedModule[] = [];

      for (const savedModule of savedModules) {
        const moduleDetails = await this.moduleHttpService.getModuleById(
          savedModule.moduleId
        );
        enrichedModules.push({
          ...savedModule,
          moduleDetails: moduleDetails,
        });
      }

      this.displayedModules.set(enrichedModules);

      // Ajouter les modules enrichis à l'arbre
      this.addModulesToTreeNode(folderId, enrichedModules);
    } catch (error: unknown) {
      console.error(
        'Erreur lors du chargement des modules sauvegardés:',
        error
      );
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur Modules',
        detail: 'Impossible de charger les modules sauvegardés.',
      });
      this.displayedModules.set([]);
    } finally {
      this.isLoadingModules.set(false);
    }
  }

  addModulesToTreeNode(
    folderId: number,
    modules: DisplayableSavedModule[]
  ): void {
    // Fonction récursive pour trouver le nœud correspondant au folderId
    const findNodeAndAddModules = (nodes: TreeNode[]): boolean => {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node.data?.folderId === folderId) {
          // Filtrer les enfants existants qui sont des dossiers (pour garder la structure)
          const folderChildren = node.children
            ? node.children.filter((child) => child.type !== 'module')
            : [];

          // Créer des nœuds pour les modules
          const moduleNodes: TreeNode[] = modules.map((module) => ({
            key: `module-${module.moduleId}`,
            label: module.moduleDetails?.title || 'Module sans nom',
            data: module, // On stocke le DisplayableSavedModule complet
            icon: 'pi pi-file',
            selectable: false,
            draggable: true,
            styleClass: 'module-file',
            droppable: false,
            type: 'module',
          }));

          // Combiner les dossiers enfants avec les modules enfants
          node.children = [...folderChildren, ...moduleNodes];
          return true;
        }

        // Recherche récursive dans les enfants
        if (node.children && node.children.length > 0) {
          if (findNodeAndAddModules(node.children)) {
            return true;
          }
        }
      }
      return false;
    };

    // Commencer la recherche à partir des nœuds racines
    const nodes = this.treeNode();
    findNodeAndAddModules([...nodes]);
  }

  async loadModulesWithoutFolder() {
    this.isLoadingModules.set(true);
    try {
      const user = this.currentUser();
      if (!user) return;
      this.moduleWithoutFolder.set(
        await this.httpUserSavedModuleService.getAllUserSavedModules(user.id)
      );
    } catch (error: unknown) {
      console.error(
        'Erreur lors du chargement des modules sauvegardés:',
        error
      );
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur Modules',
        detail: 'Impossible de charger les modules sauvegardés.',
      });
      this.moduleWithoutFolder.set([]);
    } finally {
      this.isLoadingModules.set(false);
    }
  }

  // Gestion du drag and drop pour les dossiers
  // Pour la méthode onNodeDrop existante, ajoutons une vérification du type
  onNodeDrop(event: TreeNodeDropEvent): void {
    const dragNode = event.dragNode;
    const dropNode = event.dropNode;
    console.log(dropNode)
    console.log(dragNode)

    if (!dragNode || !dropNode || !dragNode.data || !dropNode.data) return;

    // Si on déplace un module vers un dossier
    if (dragNode.type === 'module' && dragNode.data.moduleId) {
      // Logique pour déplacer un module vers un dossier
      const moduleId = dragNode.data.moduleId;
      const targetFolderId = dropNode.data.folderId;

      if (!moduleId || !targetFolderId) return;

      // Mise à jour du module avec le nouveau folderId
      const updatedModule = { ...dragNode.data, folderId: targetFolderId };
      console.log(updatedModule);

      this.httpUserSavedModuleService
        .updateSavedModule(updatedModule.savedModuleId, updatedModule)
        .then(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Module déplacé avec succès',
          });
          dropNode.expanded = true;
          this.selectFolder(dropNode);
          // Recharger l'arborescence et les modules
          // this.loadFolders();
          // this.loadModulesWithoutFolder();
        })
        .catch((error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de déplacer le module: ' + error,
          });
        });
    }
    // Si on déplace un dossier vers un autre dossier (code existant)
    else if (dragNode.data.folderId && dropNode.data.folderId) {
      const dragFolderId = dragNode.data.folderId;
      const dropFolderId = dropNode.data.folderId;

      // Mise à jour du dossier parent
      const updatedFolder = { ...dragNode.data, parentFolder: dropFolderId };

      this.httpUserFolderService
        .updateUserFolder(dragFolderId, updatedFolder)
        .then(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Dossier déplacé avec succès',
          });
          this.selectFolder(dropNode);
          // this.loadFolders(); // Recharger l'arborescence
        })
        .catch((error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de déplacer le dossier: ' + error,
          });
          // this.loadFolders();
        });
    }
  }

  // Méthodes pour le drag & drop des modules
  onModuleDragStart(module: DisplayableSavedModule): void {
    this.draggedModule = module;
  }

  onModuleDragEnd(): void {
    this.draggedModule = null;
  }

  onFolderDrop(event: any, node: TreeNode): void {
    if (this.draggedModule && node.data && node.data.folderId) {
      const targetFolderId = node.data.folderId;
      const moduleId = this.draggedModule.moduleId;

      if (!moduleId) return;

      // Mettre à jour le dossier du module
      const updatedModule = { ...this.draggedModule, folderId: targetFolderId };

      this.httpUserSavedModuleService
        .updateSavedModule(moduleId, updatedModule)
        .then(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Module déplacé avec succès',
          });
          // Mettre à jour les listes de modules
          this.loadModulesWithoutFolder();
          if (this.selectedFolder()?.data) {
            this.loadModulesForSelectedFolder(this.selectedFolder()!.data);
          }
        })
        .catch((error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de déplacer le module: ' + error,
          });
        });
    }
  }

  onNodeRightClick(event: TreeNodeContextMenuSelectEvent): void {
    this.selectedNode = event.node;
  }

  handleDialogAction(): void {
    if (this.dialogAction === 'create') {
      this.createNewFolder();
    } else if (this.dialogAction === 'rename') {
      this.performRename();
    }
  }

  showNewFolderDialog(parentNode: TreeNode | null): void {
    this.folderName = '';
    this.parentNode = parentNode;
    this.dialogTitle = 'Nouveau dossier';
    this.dialogAction = 'create';
    this.dialogVisible = true;
  }

  renameFolder(node: TreeNode | null): void {
    if (node) {
      this.folderName = node.label || '';
      this.selectedNodeForRename = node;
      this.dialogTitle = 'Renommer le dossier';
      this.dialogAction = 'rename';
      this.dialogVisible = true;
    }
  }

  deleteFolder(node: TreeNode | null): void {
    if (node && node.data && node.data.folderId) {
      this.httpUserFolderService
        .delete(node.data.folderId)
        .then(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Dossier supprimé avec succès',
          });
          this.loadFolders();
        })
        .catch((error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de supprimer le dossier: ' + error,
          });
        });
    }
  }

  createNewFolder(): void {
    if (!this.currentUser()?.id) return;

    const parentFolderId = this.parentNode?.data?.folderId || null;

    this.httpUserFolderService
      .post(
        new UserFolder(this.currentUser()!.id, this.folderName, parentFolderId)
      )
      .then(() => {
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Dossier créé avec succès',
        });
        this.loadFolders();
      })
      .catch((error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de créer le dossier: ' + error,
        });
      })
      .finally(() => {
        this.dialogVisible = false;
        this.parentNode = null;
      });
  }

  performRename(): void {
    if (this.selectedNodeForRename?.data?.folderId) {
      const folderId = this.selectedNodeForRename.data.folderId;
      const updatedFolder = {
        ...this.selectedNodeForRename.data,
        name: this.folderName,
      };

      this.httpUserFolderService
        .updateUserFolder(folderId, updatedFolder)
        .then(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Dossier renommé avec succès',
          });
          this.loadFolders();
        })
        .catch((error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de renommer le dossier: ' + error,
          });
        })
        .finally(() => {
          this.dialogVisible = false;
          this.selectedNodeForRename = null;
        });
    }
  }

  onNodeSelect(event: TreeNodeSelectEvent): void {
    if (event.node) {
      this.selectedFolder.set(event.node);

      // Si c'est un module, faire quelque chose de spécifique
      if (event.node.type === 'module') {
        // Par exemple, naviguer vers le détail du module
        if (event.node.data?.moduleId) {
          // Option 1: Rediriger vers la page de détail du module
          // this.router.navigate(['/module', event.node.data.moduleId]);

          // Option 2: Simplement sélectionner le module dans la liste
          // Ne pas charger de modules supplémentaires
          return;
        }
      }
      // Si c'est un dossier, charger les modules comme d'habitude
      else if (event.node.data) {
        this.loadModulesForSelectedFolder(event.node.data);

        // Mise à jour de l'URL avec le folderId en query parameter
        const folderId = event.node.data.folderId;
        if (folderId) {
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { folderId: folderId },
            queryParamsHandling: 'merge',
          });
        }
      }
    }
  }

  subsribe(moduleId: number) {
    console.log(moduleId);
  }

  resetModule() {
    this.moduleService.clearCurrentModule();
  }
}

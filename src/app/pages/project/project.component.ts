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
import { SelectModule } from 'primeng/select';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TooltipModule } from 'primeng/tooltip';
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
import { FolderService } from '../../services/folders.service';
import { DialogModule } from 'primeng/dialog';
import { FloatLabelModule } from 'primeng/floatlabel';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ModuleCardComponent } from '../../components/module-card/module-card.component';
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
import { ModuleSummary } from '../../classes/ModuleSummary';

interface DisplayableSavedModule extends UserSavedModule {
  moduleDetails?: ModuleSummary;
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
    ModuleCardComponent,
    TreeModule,
    ContextMenuModule,
    RouterLink,
    DragDropModule,
    SelectModule,
    ToggleButtonModule,
    SelectButtonModule,
    TooltipModule,
  ],
  providers: [TreeDragDropService],
  templateUrl: './project.component.html',
  styleUrl: './project.component.scss',
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
  private folderService = inject(FolderService);

  currentUser = computed(() => this.httpUserService.currentJdrUser());

  // --- Signals pour l'état ---
  folders = this.folderService.currentFolders.asReadonly();
  selectedFolder: WritableSignal<TreeNode | null> = signal(null);

  displayedModules: WritableSignal<DisplayableSavedModule[]> = signal([]);
  moduleWithoutFolder = signal<DisplayableSavedModule[]>([]);
  modulesSummary: WritableSignal<ModuleSummary[]> = signal([]);

  // Cache pour éviter les appels redondants
  private folderModulesCache = new Map<number, DisplayableSavedModule[]>();
  private isModulesSummaryLoaded = signal(false);

  isLoadingFolders = signal(false);
  isLoadingModules = signal(false);
  searchValue = signal('');
  draggedModule: DisplayableSavedModule | null = null;
  
  // Sidebar state
  sidebarCollapsed = signal(false);
  
  // Display and sorting options
  isGridView = signal(true);
  viewOptions = [
    { icon: 'pi pi-th-large', value: 'grid' },
    { icon: 'pi pi-list', value: 'list' }
  ];
  sortOptions = [
    { label: 'Récent', value: 'recent' },
    { label: 'Nom A-Z', value: 'name-asc' },
    { label: 'Nom Z-A', value: 'name-desc' },
    { label: 'Date de création', value: 'date-created' }
  ];
  selectedSort = signal('recent');

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
    // Nettoyer le cache au début pour s'assurer qu'on part d'un état propre
    this.clearCache();
    
    // Attendre que les dossiers soient chargés par le FolderService (s'ils ne le sont pas déjà)
    if (this.folders().length === 0) {
      await this.folderService.loadFolders();
    }
    
    // Charger les modules sans dossier et les afficher par défaut
    await this.loadModulesWithoutFolder();
    
    // Charger les modules de tous les dossiers pour avoir des statistiques précises
    await this.preloadAllFolderModules();

    // Résoudre le problème de chargement des dossiers imbriqués
    this.route.queryParamMap.subscribe((queryParams) => {
      const folderIdQueryParam = queryParams.get('folderId');
      if (folderIdQueryParam) {
        this.findAndExpandToFolder(parseInt(folderIdQueryParam, 10));
      } else {
        // Si pas de folderId en query param, sélectionner le premier dossier disponible
        // ou laisser les modules sans dossier affichés
        setTimeout(() => {
          this.selectFirstFolderOrShowModulesWithoutFolder();
        }, 100);
      }
    });
  }

  // Nouvelle méthode pour sélectionner le premier dossier ou afficher les modules sans dossier
  selectFirstFolderOrShowModulesWithoutFolder(): void {
    const nodes = this.treeNode();
    if (nodes.length > 0) {
      // Sélectionner le premier dossier disponible
      const firstNode = nodes[0];
      this.selectFolder(firstNode);
    } else {
      // Aucun dossier disponible, s'assurer que les modules sans dossier sont affichés
      this.selectedFolder.set(null);
      // Les modules sans dossier seront automatiquement affichés via filteredAndSortedModules()
    }
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

  selectNoFolder(): void {
    this.selectedFolder.set(null);
    // Les modules sans dossier seront automatiquement affichés via filteredAndSortedModules()
  }

  /**
   * Précharge les modules de tous les dossiers pour avoir des statistiques précises
   */
  async preloadAllFolderModules(): Promise<void> {
    const user = this.currentUser();
    if (!user) return;

    try {
      // S'assurer que les modules summary sont chargés
      await this.loadModulesSummary();

      // Charger les modules pour chaque dossier
      const folders = this.folders();
      for (const folder of folders) {
        if (folder.folderId && !this.folderModulesCache.has(folder.folderId)) {
          try {
            const savedModules = await this.httpUserSavedModuleService.getSavedModulesByFolder(folder.folderId);
            
            // Enrichir avec les détails des modules
            const enrichedModules: DisplayableSavedModule[] = [];
            for (const savedModule of savedModules) {
              const moduleDetails = this.modulesSummary().find(
                summary => summary.id === savedModule.moduleId
              );
              
              if (moduleDetails) {
                enrichedModules.push({
                  ...savedModule,
                  moduleDetails: moduleDetails,
                });
              }
            }
            
            // Mettre en cache
            this.folderModulesCache.set(folder.folderId, enrichedModules);
          } catch (error) {
            console.error(`Erreur lors du chargement des modules du dossier ${folder.folderId}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors du préchargement des modules:', error);
    }
  }

  /**
   * Recharge les dossiers via le FolderService
   */
  async reloadFolders(): Promise<void> {
    this.isLoadingFolders.set(true);
    try {
      await this.folderService.forceReloadFolders();
    } finally {
      this.isLoadingFolders.set(false);
    }
  }

  async loadModulesSummary(): Promise<void> {
    // Éviter les appels redondants
    if (this.isModulesSummaryLoaded()) return;

    try {
      const user = this.currentUser();
      if (!user) return;
      
      // Charger tous les modules summary de l'utilisateur
      const summaries = await this.moduleHttpService.getModulesSummaryByUserId(user.id);
      this.modulesSummary.set(summaries);
      this.isModulesSummaryLoaded.set(true);
    } catch (error) {
      console.error('Erreur lors du chargement des modules summary:', error);
    }
  }

  // Méthodes pour gérer le cache
  private clearCache(): void {
    this.folderModulesCache.clear();
    this.isModulesSummaryLoaded.set(false);
  }

  private invalidateFolderCache(folderId: number): void {
    this.folderModulesCache.delete(folderId);
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

      // Vérifier si les modules pour ce dossier sont déjà en cache
      if (this.folderModulesCache.has(folderId)) {
        const cachedModules = this.folderModulesCache.get(folderId)!;
        this.displayedModules.set(cachedModules);
        this.addModulesToTreeNode(folderId, cachedModules);
        return;
      }

      // S'assurer que les modules summary sont chargés
      await this.loadModulesSummary();

      // Récupérer les modules sauvegardés
      const savedModules =
        await this.httpUserSavedModuleService.getSavedModulesByFolder(folderId);

      // Enrichir chaque savedModule avec les détails du module depuis le cache summary
      const enrichedModules: DisplayableSavedModule[] = [];

      for (const savedModule of savedModules) {
        const moduleDetails = this.modulesSummary().find(
          summary => summary.id === savedModule.moduleId
        );
        
        if (moduleDetails) {
          enrichedModules.push({
            ...savedModule,
            moduleDetails: moduleDetails,
          });
        }
      }

      // Mettre en cache et afficher
      this.folderModulesCache.set(folderId, enrichedModules);
      this.displayedModules.set(enrichedModules);
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
      for (const node of nodes) {
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
      
      // S'assurer que les modules summary sont chargés
      await this.loadModulesSummary();
      
      // Récupérer tous les modules sauvegardés de l'utilisateur
      const allSavedModules = await this.httpUserSavedModuleService.getAllUserSavedModules(user.id);
      
      // Filtrer pour ne garder que ceux sans dossier
      const modulesWithoutFolder = allSavedModules.filter(module => !module.folderId);
      
      // Enrichir chaque savedModule avec les détails du module depuis le cache summary
      const enrichedModules: DisplayableSavedModule[] = [];

      for (const savedModule of modulesWithoutFolder) {
        const moduleDetails = this.modulesSummary().find(
          summary => summary.id === savedModule.moduleId
        );
        
        if (moduleDetails) {
          enrichedModules.push({
            ...savedModule,
            moduleDetails: moduleDetails,
          });
        }
      }
      
      this.moduleWithoutFolder.set(enrichedModules);
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
          
          // Invalider le cache des dossiers affectés
          const originalFolderId = dragNode.data.folderId;
          if (originalFolderId) {
            this.invalidateFolderCache(originalFolderId);
          }
          this.invalidateFolderCache(targetFolderId);
          
          dropNode.expanded = true;
          this.selectFolder(dropNode);
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

  // Nouvelles méthodes pour les statistiques
  getTotalModulesCount(): number {
    // Compter les modules sans dossier
    const withoutFolder = this.moduleWithoutFolder().length;
    
    // Compter tous les modules dans tous les dossiers en parcourant le cache
    let inFolders = 0;
    this.folderModulesCache.forEach((modules) => {
      inFolders += modules.length;
    });
    
    return withoutFolder + inFolders;
  }

  getFoldersCount(): number {
    return this.folders().length;
  }

  getRecentModulesCount(): number {
    // Collecter tous les modules avec leurs dates de modification
    const allModules: DisplayableSavedModule[] = [];
    
    // Ajouter les modules sans dossier
    allModules.push(...this.moduleWithoutFolder());
    
    // Ajouter tous les modules des dossiers depuis le cache
    this.folderModulesCache.forEach((modules) => {
      allModules.push(...modules);
    });
    
    // Trier par date de modification récente et prendre les 5 derniers
    const recentModules = allModules
      .filter(module => module.moduleDetails)
      .sort((a, b) => {
        const aUpdatedAt = 'updatedAt' in (a.moduleDetails || {}) 
          ? (a.moduleDetails as any).updatedAt 
          : a.moduleDetails?.versions?.[0]?.updatedAt || '';
        const bUpdatedAt = 'updatedAt' in (b.moduleDetails || {}) 
          ? (b.moduleDetails as any).updatedAt 
          : b.moduleDetails?.versions?.[0]?.updatedAt || '';
        return new Date(bUpdatedAt).getTime() - new Date(aUpdatedAt).getTime();
      })
      .slice(0, 5);
    
    return recentModules.length;
  }

  getDisplayedModulesLength(): number {
    if (this.selectedFolder()) {
      return this.displayedModules().length;
    } else {
      return this.moduleWithoutFolder().length;
    }
  }

  onFolderDrop(node: TreeNode): void {
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
          
          // Invalider le cache des dossiers affectés
          const originalFolderId = this.draggedModule!.folderId;
          if (originalFolderId) {
            this.invalidateFolderCache(originalFolderId);
          }
          this.invalidateFolderCache(targetFolderId);
          
          // Recharger seulement si nécessaire
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
          // Invalider le cache pour ce dossier
          this.invalidateFolderCache(node.data.folderId);
          this.reloadFolders();
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
        // Pas besoin d'invalider le cache car c'est un nouveau dossier vide
        this.reloadFolders();
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
          // Le renommage n'affecte pas le contenu, pas besoin d'invalider le cache des modules
          this.reloadFolders();
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

  toggleSidebar() {
    this.sidebarCollapsed.set(!this.sidebarCollapsed());
  }

  // Computed for filtered and sorted modules
  filteredAndSortedModules = computed(() => {
    let modules = this.selectedFolder() ? this.displayedModules() : this.moduleWithoutFolder();
    
    // Apply search filter
    const searchTerm = this.searchValue().toLowerCase();
    if (searchTerm) {
      modules = modules.filter(module => 
        module.moduleDetails?.title?.toLowerCase().includes(searchTerm) ||
        module.moduleDetails?.description?.toLowerCase().includes(searchTerm)
      );
    }
    
    // Apply sorting
    const sortBy = this.selectedSort();
    return modules.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return (a.moduleDetails?.title || '').localeCompare(b.moduleDetails?.title || '');
        case 'name-desc':
          return (b.moduleDetails?.title || '').localeCompare(a.moduleDetails?.title || '');
        case 'date-created': {
          // Try to use Module's createdAt if available, otherwise use versions
          const aCreatedAt = 'createdAt' in (a.moduleDetails || {}) 
            ? (a.moduleDetails as Module).createdAt 
            : a.moduleDetails?.versions?.[0]?.createdAt || '';
          const bCreatedAt = 'createdAt' in (b.moduleDetails || {}) 
            ? (b.moduleDetails as Module).createdAt 
            : b.moduleDetails?.versions?.[0]?.createdAt || '';
          return new Date(bCreatedAt).getTime() - new Date(aCreatedAt).getTime();
        }
        case 'recent':
        default: {
          // Try to use Module's updatedAt if available, otherwise use versions
          const aUpdatedAt = 'updatedAt' in (a.moduleDetails || {}) 
            ? (a.moduleDetails as Module).updatedAt 
            : a.moduleDetails?.versions?.[0]?.updatedAt || '';
          const bUpdatedAt = 'updatedAt' in (b.moduleDetails || {}) 
            ? (b.moduleDetails as Module).updatedAt 
            : b.moduleDetails?.versions?.[0]?.updatedAt || '';
          return new Date(bUpdatedAt).getTime() - new Date(aUpdatedAt).getTime();
        }
      }
    });
  });

  // Methods for view toggle
  toggleGridView() {
    this.isGridView.set(true);
  }

  toggleListView() {
    this.isGridView.set(false);
  }

  // Method for sort change
  onSortChange(selectedSort: string) {
    this.selectedSort.set(selectedSort);
  }
  
  // Method for handling select change events safely
  onSelectChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.onSortChange(target?.value || '');
  }

  // Methods for icon bar
  getRootFolderNodes(): TreeNode[] {
    return this.treeNode().filter(node => !node.parent);
  }

  selectFolderFromIcon(node: TreeNode): void {
    this.selectedFolder.set(node);
    if (node.data) {
      this.loadModulesForSelectedFolder(node.data);
      
      // Mise à jour de l'URL avec le folderId en query parameter
      const folderId = node.data.folderId;
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

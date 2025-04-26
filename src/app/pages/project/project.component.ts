import { Component, inject, OnInit, signal, WritableSignal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms'; // Nécessaire pour ngModel avec Listbox

// PrimeNG Modules
import { DataViewModule } from 'primeng/dataview';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ListboxModule } from 'primeng/listbox';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MenuItem, TreeNode } from 'primeng/api'; // Pour Listbox
import { UserFolderHttpService } from '../../services/https/user-folder-http.service';
import { ModuleHttpService } from '../../services/https/module-http.service'; // Pour récupérer les détails des modules
import { MessageService } from 'primeng/api';
import { UserFolder } from '../../classes/UserFolder';
import { UserSavedModule } from '../../classes/UserSavedModule';
import { ModuleResponse } from '../../classes/ModuleResponse';
import { UserHttpService } from '../../services/https/user-http.service';
import { UserSavedModuleHttpService } from '../../services/https/user-saved-module-http.service';
import { DialogModule } from 'primeng/dialog';
import { FloatLabelModule } from 'primeng/floatlabel';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ModuleViewerComponent } from '../../components/module-viewer/module-viewer.component';
import { TreeModule, TreeNodeContextMenuSelectEvent, TreeNodeSelectEvent } from 'primeng/tree';
import { ContextMenuModule } from 'primeng/contextmenu';
import { RouterLink } from '@angular/router';

interface DisplayableSavedModule extends UserSavedModule {
  moduleDetails?: ModuleResponse;
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
    RouterLink
  ],
  templateUrl: './project.component.html',
  styleUrls: ['./project.component.scss'],
})
export class ProjectComponent implements OnInit {

  private httpUserFolderService = inject(UserFolderHttpService);
  private httpUserService = inject(UserHttpService);
  private httpUserSavedModuleService = inject(UserSavedModuleHttpService);
  private moduleHttpService = inject(ModuleHttpService);
  private messageService = inject(MessageService);

  currentUser = computed(() => this.httpUserService.currentJdrUser())

  // --- Signals pour l'état ---
  folders: WritableSignal<UserFolder[]> = signal([]);
  selectedFolder: WritableSignal<TreeNode | null> = signal(null);

  displayedModules: WritableSignal<DisplayableSavedModule[]> = signal([]);

  isLoadingFolders = signal(false);
  isLoadingModules = signal(false);
  searchValue = signal('');

  selectedFolderName = computed(() => {

  });
  contextMenuItems: MenuItem[] = [
    {
      label: 'Nouveau dossier',
      icon: 'pi pi-fw pi-plus',
      command: () => this.showNewFolderDialog(this.selectedNode)
    },
    {
      label: 'Renommer',
      icon: 'pi pi-fw pi-pencil',
      command: () => this.renameFolder(this.selectedNode)
    },
    {
      label: 'Supprimer',
      icon: 'pi pi-fw pi-trash',
      command: () => this.deleteFolder(this.selectedNode)
    }
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

    console.log(this.folders())

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

  dialogVisible = false;
  folderName = "";

  async ngOnInit(): Promise<void> {
    await this.loadFolders();
    // Sélectionner le premier dossier s'il existe
    if (this.treeNode().length > 0) {
      const firstNode = this.treeNode()[0];
      this.selectFolder(firstNode);
    }
    // this.httpUserSavedModuleService.post(new UserSavedModule(4,1,1, 3))
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
      if(!user) return [];
      const fetchedFolders = await this.httpUserFolderService.getAllUserFolders(user.id);
      this.folders.set(fetchedFolders);
      return fetchedFolders;
    } catch (error: unknown) {
      this.messageService.add({ severity: 'error', summary: 'Erreur Dossiers', detail: 'Impossible de charger les dossiers.' + error });
      return [];
    } finally {
      this.isLoadingFolders.set(false);
    }
  }

  /**
   * Charge les modules sauvegardés en fonction du dossier sélectionné (this.selectedFolderId)
   */
  async loadModulesForSelectedFolder(folder: UserFolder): Promise<void> {
    this.isLoadingModules.set(true);
    try {
      const user = this.currentUser()
      if (!user) return
      const folderId = folder?.folderId;
      if (!folderId) return
      this.displayedModules.set(await this.httpUserSavedModuleService.getSavedModulesByFolder(folderId));
    } catch (error: unknown) {
      console.error('Erreur lors du chargement des modules sauvegardés:', error);
      this.messageService.add({ severity: 'error', summary: 'Erreur Modules', detail: 'Impossible de charger les modules sauvegardés.' });
      this.displayedModules.set([]); // Assure que la liste est vide en cas d'erreur
    } finally {
      this.isLoadingModules.set(false);
    }
  }

  onNodeRightClick(event: TreeNodeContextMenuSelectEvent): void {
    console.log(event)
    this.selectedNode = event.node;
  }

  handleDialogAction(): void {
    if (this.dialogAction === 'create') {
      this.createNewFolder();
    } else if (this.dialogAction === 'rename') {
      this.performRename();
    }
  }

  // Méthode pour afficher la boîte de dialogue de création de dossier
  showNewFolderDialog(parentNode: TreeNode | null): void {
    this.folderName = "";
    this.parentNode = parentNode;
    this.dialogTitle = "Nouveau dossier";
    this.dialogAction = "create";
    this.dialogVisible = true;
  }

  // Méthode pour renommer un dossier
  renameFolder(node: TreeNode | null): void {
    if (node) {
      this.folderName = node.label || "";
      this.selectedNodeForRename = node;
      this.dialogTitle = "Renommer le dossier";
      this.dialogAction = "rename";
      this.dialogVisible = true;
    }
  }

  // Méthode pour supprimer un dossier
  deleteFolder(node: TreeNode | null): void {
    if (node && node.data && node.data.folderId) {
      // Vous pouvez ajouter une confirmation ici si nécessaire
      this.httpUserFolderService.delete(node.data.folderId)
        .then(() => {
          this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Dossier supprimé avec succès' });
          this.loadFolders(); // Recharger tous les dossiers
        })
        .catch(error => {
          this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de supprimer le dossier: ' + error });
        });
    }
  }


  createNewFolder(): void {
    if (!this.currentUser()?.id) return;

    // Déterminer le parent folder ID
    const parentFolderId = this.parentNode?.data?.folderId || null;
    console.log(this.parentNode)

    this.httpUserFolderService.post(new UserFolder(this.currentUser()!.id, this.folderName, parentFolderId))
      .then(() => {
        this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Dossier créé avec succès' });
        this.loadFolders()
      })
      .catch(error => {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de créer le dossier: ' + error });
      })
      .finally(() => {
        this.dialogVisible = false;
        this.parentNode = null;
      });
  }

  performRename(): void {
    if (this.selectedNodeForRename?.data?.folderId) {
      const folderId = this.selectedNodeForRename.data.folderId;
      const updatedFolder = { ...this.selectedNodeForRename.data, name: this.folderName };
      console.log(updatedFolder)

      this.httpUserFolderService.updateUserFolder(folderId, updatedFolder)
        .then(() => {
          this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Dossier renommé avec succès' });
          // Mettre à jour l'état local
          this.loadFolders();
        })
        .catch(error => {
          this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de renommer le dossier: ' + error });
        })
        .finally(() => {
          this.dialogVisible = false;
          this.selectedNodeForRename = null;
        });
    }
  }

  // Ajouter cette méthode dans le project.component.ts
  onNodeSelect(event: TreeNodeSelectEvent): void {
    if (event.node) {
      this.selectedFolder.set(event.node);
      if (event.node.data) {
        this.loadModulesForSelectedFolder(event.node.data);
      }
    }
  }

  subsribe(moduleId: number) {
    console.log(moduleId);
  }
}

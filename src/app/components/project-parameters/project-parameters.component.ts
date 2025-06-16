import {
  Component,
  computed,
  inject,
  input,
  model,
  OnInit,
  output,
  signal,
  viewChild,
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
import { FolderService } from '../../services/folders.service';
import { MessageService, TreeNode } from 'primeng/api';
import { UserSavedModule } from '../../classes/UserSavedModule';
import { ModuleVersion } from '../../classes/ModuleVersion';
import { ModuleVersionHttpService } from '../../services/https/module-version-http.service';
import { ModuleService } from '../../services/module.service';
import { GameSystemHttpService } from '../../services/https/game-system-http.service';
import { ActivatedRoute, Router } from '@angular/router';
import { TreeSelectModule } from 'primeng/treeselect';
import { AutoComplete, AutoCompleteModule } from 'primeng/autocomplete';
import { TagHttpService } from '../../services/https/tag-http.service';
import { Tag } from '../../classes/Tag';
import { HttpErrorResponse } from '@angular/common/http';
import { TagRequest } from '../../interfaces/TagRequest';
import { ChipModule } from 'primeng/chip';
import { AvatarGroupModule } from 'primeng/avatargroup';
import { AvatarModule } from 'primeng/avatar';
import { FileUploadModule, FileSelectEvent } from 'primeng/fileupload';
import { ImageModule } from 'primeng/image';
import { FileHttpService } from '../../services/https/file-http.service';
import { Picture } from '../../classes/Picture';

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
    TreeSelectModule,
    AutoCompleteModule,
    ChipModule,
    AvatarModule,
    AvatarGroupModule,
    FileUploadModule,
    ImageModule,
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
  private tagsHttpService = inject(TagHttpService);
  private fileuploadService = inject(FileHttpService);
  private folderService = inject(FolderService);

  autocomplete = viewChild<AutoComplete>('autocomplete');

  // Inputs
  currentModule = input.required<Module>();
  currentVersion = model.required<ModuleVersion>();
  versions = computed(() => this.currentModule().versions);
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

  folders = this.folderService.currentFolders.asReadonly();
  foldersName = computed(() => this.folders().map((folder) => folder.name));
  selectedFolder = signal<TreeNode | null>(null);

  gameLoading = false;
  folderLoading = false;

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
    console.log(nodes);
    return nodes;
  });

  tagsSearch = signal<Tag[]>([]);
  suggestionsTags = signal<Tag[]>([]);

  isReadOnly = input<boolean>(false);
  canPublish = input<boolean>(true);
  canInvite = input<boolean>(true);
  selectedUsers = signal<User[]>([]);

  uploadingModuleImage = signal(false);
  moduleImagePreview = signal<string>('');

  async ngOnInit(): Promise<void> {
    if (this.currentModule()) {
      const usersWithAccess = this.currentModule()!.accesses.map(
        (access) => access.user
      );
      this.selectedUsers.set(usersWithAccess);
    }
    this.getTagsForModule();
    this.loadTags();
    
    // Attendre que les dossiers soient chargés par le FolderService (s'ils ne le sont pas déjà)
    if (this.folders().length === 0) {
      await this.folderService.loadFolders();
    }
    
    this.findInUserSavedModule();
    try {
      this.gameLoading = true;
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

  showInitialTags(): void {
    this.suggestionsTags.set([]);
    this.loadTags();
  }
  onEnterKeyForTags(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.value.trim();
    console.log(value);
    if (value) {
      this.createNewTag(value);
    }
  }
  getImageForUser(user: User): string | undefined {
    // console.log(user)
    return '';
  }
  getGameSystemName(id: number){
    return this.gameSystems().find(g => g.id === id)?.name
  }

  onSelect(value: string) {
    if (value) {
      const tagReq: TagRequest = { name: value, moduleIds: [] };
      tagReq.moduleIds.push(this.currentModule().id);
      this.tagsHttpService
        .createTag(tagReq)
        .then((newTag) => {
          let actualTag = this.tagsSearch().find((tag) => tag.name == value);
          if (actualTag) actualTag = newTag;
          this.tagsSearch().map((tag) => {
            if (tag.name == actualTag?.name) tag = actualTag;
          });
          this.messageService.add({
            severity: 'success',
            summary: 'Tags',
            detail: 'Tag ajouté avec succés',
          });
        })
        .catch((error: HttpErrorResponse) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Tags',
            detail: "Erreur lors de l'ajout du tag : " + error.message,
          });
          console.log(error);
        });
    }
  }

  onUnSelect(id: number) {
    if (id) {
      this.tagsHttpService
        .deleteModuleOfTags(id, this.currentModule().id)
        .then(() =>
          this.messageService.add({
            severity: 'success',
            summary: 'Tags',
            detail: 'Tag supprimé avec succés',
          })
        );
    }
  }

  addTag(tag: Tag): void {
    const isAlreadySelected = this.tagsSearch().some((t) => t.id === tag.id);

    if (!isAlreadySelected) {
      this.tagsSearch.update((tags) => {
        return [...tags, tag];
      });
    }
  }

  createNewTag(tagName: string): void {
    const tagReq: TagRequest = { name: tagName, moduleIds: [] };
    tagReq.moduleIds.push(this.currentModule().id);
    this.tagsHttpService
      .createTag(tagReq)
      .then((newTag) => {
        this.addTag(newTag);
        this.messageService.add({
          severity: 'success',
          summary: 'Tags',
          detail: 'Tag créé et ajouté avec succés',
        });
      })
      .catch((error: HttpErrorResponse) => {
        console.log(error);
      });
  }

  async autoCompleteRes(search: string): Promise<void> {
    try {
      if (!search || search.trim() === '') {
        // this.loadTags();
        return;
      }

      const resultat = await this.tagsHttpService.searchTags(search);
      this.suggestionsTags.set(resultat);
    } catch (error: any) {
      this.suggestionsTags.set([]);
    }
  }

  loadTags() {
    this.tagsHttpService
      .get15tags()
      .then((tags) => this.suggestionsTags.set(tags))
      .catch(() => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de charger les tags',
        });
      });
  }

  getTagsForModule() {
    this.tagsHttpService
      .getTagsByModuleId(this.currentModule().id)
      .then((tags) => this.tagsSearch.set(tags));
  }

  save(): void {
    if (this.isReadOnly()) return;
    this.saveRequested.emit();
  }

  generateCompleteModule(): void {
    this.generateModuleRequested.emit();
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
            this.httpUserFolderService
              .getUserFolderById(savMod.folderId)
              .then((folder) => {
                // Utiliser une fonction de recherche récursive au lieu de find()
                const foundNode = this.findNodeRecursively(
                  this.treeNode(),
                  folder.folderId ?? 0
                );
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
        const foundInChildren = this.findNodeRecursively(
          node.children,
          folderId
        );
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
    this.httpUserSavedModuleService
      .getAllUserSavedModules(user!.id)
      .then((allUserSavedModules: UserSavedModule[]) => {
        // Trouver toutes les associations existantes pour ce module/version
        const existingModuleAssociations = allUserSavedModules.filter(
          (save) =>
            save.moduleId === currentModuleId &&
            save.moduleVersionId === currentVersionId
        );

        // Si des associations existantes sont trouvées dans d'autres dossiers que celui sélectionné
        const promises: Promise<any>[] = [];

        existingModuleAssociations.forEach((association) => {
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
            (association) =>
              association.folderId === this.selectedFolder()!.data.folderId
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
          detail:
            'Le Module fait maintenant partie du dossier ' +
            this.selectedFolder()?.data.name,
        });
      })
      .catch((error) => {
        console.error('Erreur lors de la mise à jour du dossier:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de mettre à jour le dossier',
        });
      })
      .finally(() => (this.folderLoading = false));
  }

  createNewVersion() {
    this.httpModuleVersionService
      .createModuleVersion(
        this.currentModule().id,
        new ModuleVersion(
          this.currentModule().id,
          this.currentModule().versions.length + 1,
          this.currentUser()!,
          this.currentGameSystem()!.id!,
          false
        )
      )
      .then(async (newVersion) => {
        // Rafraîchir le module
        await this.moduleService.refreshCurrentModule();

        // Obtenir le module mis à jour et la nouvelle version
        const updatedModule = this.moduleService.currentModule();
        if (updatedModule) {
          // Trouver la nouvelle version
          const latestVersion =
            updatedModule.versions.find((v) => v.id === newVersion.id) ||
            updatedModule.versions[updatedModule.versions.length - 1];

          // Mettre à jour directement via le service
          this.moduleService.currentModuleVersion.set(latestVersion);

          // Mettre à jour aussi l'URL directement
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { versionId: latestVersion.id },
            queryParamsHandling: 'merge',
            replaceUrl: true,
          });

          // Message de succès
          this.messageService.add({
            severity: 'success',
            summary: 'Nouvelle version',
            detail: 'La nouvelle version a été créée et sélectionnée',
          });
        }
      })
      .catch((error) => {
        console.error('Erreur lors de la création de la version:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de créer la nouvelle version',
        });
      });
  }

  published() {
    if (!this.canPublish()) return;
    this.currentVersion().published = !this.currentVersion().published;
    this.loadingPublished.set(true);
    this.httpModuleVersionService
      .updateModuleVersion(this.currentVersion().id!, this.currentVersion())
      .then(() => {
        if (this.currentVersion().published) {
          this.messageService.add({
            severity: 'success',
            summary: 'Version',
            detail: 'La version a été publiée',
          });
        } else {
          this.messageService.add({
            severity: 'success',
            summary: 'Version',
            detail: 'La version a été rendu privée',
          });
        }
      })
      .finally(() => this.loadingPublished.set(false));
  }

  onModuleImageSelect(event: FileSelectEvent) {
    if (this.isReadOnly()) return;

    const file = event.files[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      console.error("Le fichier sélectionné n'est pas une image");
      return;
    }

    // Vérifier la taille (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      console.error("L'image est trop volumineuse (max 5MB)");
      return;
    }

    this.uploadingModuleImage.set(true);

    // Upload file to server
    this.fileuploadService.uploadFile(file)
      .then((fileId) => {
        // Update the module picture
        if (this.currentModule().picture) {
          this.currentModule().picture.src = fileId;
          this.currentModule().picture.title = file.name;
        } else {
          this.currentModule().picture = new Picture(
            file.name,
            fileId,
            new Date().toISOString(),
            new Date().toISOString()
          );
        }

        // Create preview for display
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          this.moduleImagePreview.set(result);
          this.uploadingModuleImage.set(false);
        };
        reader.readAsDataURL(file);

        this.messageService.add({
          severity: 'success',
          summary: 'Image',
          detail: 'Image du module mise à jour avec succès',
        });
      })
      .catch((error) => {
        console.error('Erreur lors de l\'upload de l\'image du module:', error);
        this.uploadingModuleImage.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible d\'uploader l\'image du module',
        });
      });
  }

  removeModuleImage() {
    if (this.isReadOnly()) return;

    if (this.currentModule().picture) {
      this.currentModule().picture.src = '';
      this.currentModule().picture.title = '';
    }
    this.moduleImagePreview.set('');

    this.messageService.add({
      severity: 'success',
      summary: 'Image',
      detail: 'Image du module supprimée',
    });
  }

  hasModuleImage(): boolean {
    return !!this.currentModule().picture?.src;
  }

  getModuleImageSrc(): string {
    const src = this.currentModule().picture?.src;
    if (!src) return '';
    
    // If we have a preview from FileReader, use it; otherwise use server file ID
    return this.moduleImagePreview() || src;
  }

  getModuleImageTitle(): string {
    return this.currentModule().picture?.title || 'Image du module';
  }
}

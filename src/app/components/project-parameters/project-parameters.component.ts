// src/app/components/project-parameters/project-parameters.component.ts
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
import { MessageService, TreeNode } from 'primeng/api';
import { UserSavedModule } from '../../classes/UserSavedModule';
import { ModuleVersion } from '../../classes/ModuleVersion';
import { ModuleVersionHttpService } from '../../services/https/module-version-http.service';
import { ModuleService } from '../../services/module.service';
import { GameSystemHttpService } from '../../services/https/game-system-http.service';
import { ActivatedRoute, Router } from '@angular/router';
import { TreeSelectModule } from 'primeng/treeselect';
import { AutoComplete, AutoCompleteCompleteEvent, AutoCompleteModule } from 'primeng/autocomplete';
import { TagHttpService } from '../../services/https/tag-http.service';
import { Tag } from '../../classes/Tag';
import { HttpErrorResponse } from '@angular/common/http';
import { TagRequest } from '../../interfaces/TagRequest';
import { ChipModule } from 'primeng/chip';
import { AvatarGroupModule } from 'primeng/avatargroup';
import { AvatarModule } from 'primeng/avatar';

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

  autocomplete = viewChild<AutoComplete>('autocomplete');

  currentModule = input.required<Module>();
  currentVersion = model.required<ModuleVersion>();
  versions = computed(() => this.currentModule().versions);
  gameSystems = signal<GameSystem[]>([]);
  currentUser = input<User | null>(null);
  loadingSave = input<boolean>(false);
  loadingPublished = signal<boolean>(false);
  currentGameSystem = model<GameSystem | undefined>(undefined);
  needToCreate = computed(() => this.currentModule()?.id === 0);

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

    this.folders().forEach((folder) => {
      if (!folder.parentFolder) rootFolders.push(folder);
      else childFolders.push(folder);
    });

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
      if (folder.folderId) folderMap.set(folder.folderId, node);
    });

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
            if (!parentNode.children) parentNode.children = [];
            parentNode.children.push(childNode);
            if (folder.folderId) folderMap.set(folder.folderId, childNode);
            remainingChildren = remainingChildren.filter((f) => f !== folder);
            processedAny = true;
          }
        }
      });
      if (processedAny && remainingChildren.length > 0) {
        childFolders = remainingChildren;
        addChildren();
      }
    };
    addChildren();
    return nodes;
  });

  tagsSearch = signal<Tag[]>([]);
  suggestionsTags = signal<Tag[]>([]);

  isReadOnly = input<boolean>(false); // This will receive isEffectivelyReadOnly
  canPublish = input<boolean>(true);
  canInvite = input<boolean>(true);
  selectedUsers = signal<User[]>([]);

  async ngOnInit(): Promise<void> {
    if (this.currentModule()) {
      const usersWithAccess = this.currentModule()!.accesses.map(
        (access) => access.user
      );
      this.selectedUsers.set(usersWithAccess);
    }
    if (this.currentModule().id !== 0) {
      this.getTagsForModule();
    }
    this.loadTags();
    await this.loadFolders();
    if (this.currentModule().id !== 0) {
      this.findInUserSavedModule();
    }
    try {
      this.gameLoading = true;
      const systems = await this.gameSystemHttpService.getAllGameSystems();
      this.gameSystems.set(systems);

      const versionGameSystemId = this.currentVersion()?.gameSystemId;
      if (versionGameSystemId) {
        const foundSystem = systems.find((s) => s.id === versionGameSystemId);
        this.currentGameSystem.set(
          foundSystem || (systems.length > 0 ? systems[0] : undefined)
        );
      } else if (systems.length > 0) {
        this.currentGameSystem.set(systems[0]);
      }
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
    if (this.isReadOnly()) return;
    const target = event.target as HTMLInputElement;
    const value = target.value.trim();
    if (value) this.createNewTag(value);
    target.value = ''; // Clear input after adding
    this.autocomplete()?.clear(); // Clear autocomplete suggestions/selection
    this.autocomplete()?.hide(); // Hide overlay
  }
  getImageForUser(user: User): string | undefined {
    return '';
  }
  getGameSystemName(id: number) {
    return this.gameSystems().find((g) => g.id === id)?.name;
  }

  onSelectTag(tag: Tag) {
    // event is a Tag object from selection
    if (this.isReadOnly()) return;
    if (tag && tag.name) {
      // Check if tag and tag.name exist
      const tagReq: TagRequest = {
        name: tag.name,
        moduleIds: [this.currentModule().id],
      };
      // ... rest of your logic
      this.tagsHttpService
        .createTag(tagReq)
        .then((newTag) => {
          // Check if the tag is already in tagsSearch by ID to avoid duplicates from server response
          if (!this.tagsSearch().some((t) => t.id === newTag.id)) {
            this.tagsSearch.update((tags) => [...tags, newTag]);
          } else {
            // If tag exists, maybe update it if necessary, or just ensure UI consistency
            this.tagsSearch.update((tags) =>
              tags.map((t) => (t.id === newTag.id ? newTag : t))
            );
          }
          this.messageService.add({
            severity: 'success',
            summary: 'Tags',
            detail: 'Tag ajouté avec succès',
          });
          this.autocomplete()?.clear(); // Clear the input field of autocomplete
          this.suggestionsTags.set([]); // Clear suggestions
        })
        .catch((error: HttpErrorResponse) => {
          if (error.status === 409) {
            // Example: Conflict, tag already exists and associated
            // If tag already exists and associated, ensure it's in tagsSearch
            if (!this.tagsSearch().some((t) => t.name === tag.name)) {
              this.tagsSearch.update((tags) => [...tags, tag]); // Add the selected tag from suggestions
            }
            this.messageService.add({
              severity: 'info',
              summary: 'Tags',
              detail: 'Ce tag est déjà associé à ce module.',
            });
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'Tags',
              detail: "Erreur lors de l'ajout du tag : " + error.message,
            });
          }
          console.error(error);
        });
    }
    // Clear the input field of autocomplete after selection
    if (this.autocomplete && this.autocomplete()!.inputEL) {
      this.autocomplete()!.inputEL!.nativeElement!.value = '';
    }
    this.suggestionsTags.set([]); // Clear suggestions
  }

  onUnselectTag(id: number) {
    // Renamed from onUnSelect
    if (this.isReadOnly()) return;
    if (id) {
      this.tagsHttpService
        .deleteModuleOfTags(id, this.currentModule().id)
        .then(() => {
          this.tagsSearch.update((tags) => tags.filter((t) => t.id !== id)); 
          this.messageService.add({
            severity: 'success',
            summary: 'Tags',
            detail: 'Tag supprimé avec succés',
          });
        });
    }
  }

  addTag(tag: Tag): void {
    if (this.isReadOnly()) return;
    const isAlreadySelected = this.tagsSearch().some((t) => t.id === tag.id);
    if (!isAlreadySelected) {
      this.tagsSearch.update((tags) => [...tags, tag]);
    }
  }

  createNewTag(tagName: string): void {
    if (this.isReadOnly()) return;
    const tagReq: TagRequest = {
      name: tagName,
      moduleIds: [this.currentModule().id],
    };
    this.tagsHttpService
      .createTag(tagReq)
      .then((newTag) => {
        this.addTag(newTag); // Add to the local list for display
        this.messageService.add({
          severity: 'success',
          summary: 'Tags',
          detail: 'Tag créé et ajouté avec succès',
        });
      })
      .catch((error: HttpErrorResponse) => console.log(error));
  }

  async autoCompleteRes(event: AutoCompleteCompleteEvent): Promise<void> {
    const search = event.query;
    try {
      if (!search || search.trim() === '') {
        this.loadTags(); // Load initial/most used if query is empty
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
      .catch(() =>
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de charger les tags',
        })
      );
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
    if (this.isReadOnly()) return;
    this.generateModuleRequested.emit();
  }

  async loadFolders(): Promise<UserFolder[]> {
    this.folderLoading = true;
    try {
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
        detail: `Impossible de charger les dossiers.${error}`,
      });
      return [];
    } finally {
      this.folderLoading = false;
    }
  }

  findInUserSavedModule() {
    const user = this.currentUser();
    if (user && this.currentModule().id !== 0 && this.currentVersion()?.id) {
      this.httpUserSavedModuleService
        .getAllUserSavedModules(user.id)
        .then((savedModules: UserSavedModule[]) => {
          const savMod = savedModules.find(
            (save) =>
              save.moduleId === this.currentModule().id &&
              save.moduleVersionId === this.currentVersion()!.id
          );
          if (savMod && savMod.folderId) {
            const foundNode = this.findNodeRecursively(
              this.treeNode(),
              savMod.folderId
            );
            if (foundNode) this.selectedFolder.set(foundNode);
          }
        });
    }
  }

  findNodeRecursively(nodes: TreeNode[], folderId: number): TreeNode | null {
    for (const node of nodes) {
      if (node.key === folderId.toString()) return node;
      if (node.children && node.children.length > 0) {
        const foundInChildren = this.findNodeRecursively(
          node.children,
          folderId
        );
        if (foundInChildren) return foundInChildren;
      }
    }
    return null;
  }

  saveFolder() {
    if (
      this.isReadOnly() ||
      !this.selectedFolder() ||
      !this.selectedFolder()!.data?.folderId
    )
      return;

    this.folderLoading = true;
    const user = this.currentUser();
    const currentModuleId = this.currentModule().id;
    const currentVersionId = this.currentVersion()?.id;

    if (!user || !currentModuleId || !currentVersionId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Données manquantes',
        detail: 'Impossible de sauvegarder le dossier.',
      });
      this.folderLoading = false;
      return;
    }
    const targetFolderId = this.selectedFolder()!.data.folderId!;

    this.httpUserSavedModuleService
      .getAllUserSavedModules(user!.id)
      .then((allUserSavedModules: UserSavedModule[]) => {
        const existingAssociations = allUserSavedModules.filter(
          (save) =>
            save.moduleId === currentModuleId &&
            save.moduleVersionId === currentVersionId
        );
        const promises: Promise<any>[] = existingAssociations
          .filter(
            (assoc) => assoc.folderId !== targetFolderId && assoc.savedModuleId
          )
          .map((assoc) =>
            this.httpUserSavedModuleService.delete(assoc.savedModuleId!)
          );

        return Promise.all(promises).then(() => {
          const existingInSelectedFolder = existingAssociations.find(
            (assoc) => assoc.folderId === targetFolderId
          );
          if (existingInSelectedFolder) {
            // Already in the target folder, no action needed unless alias changes
            return existingInSelectedFolder;
          } else {
            // Not in target folder, create new association
            return this.httpUserSavedModuleService.post(
              new UserSavedModule(
                user!.id,
                currentModuleId,
                currentVersionId,
                targetFolderId,
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
          detail: `Module associé au dossier ${
            this.selectedFolder()?.data.name
          }`,
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
    if (this.isReadOnly()) return;
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
        await this.moduleService.refreshCurrentModule();
        const updatedModule = this.moduleService.currentModule();
        if (updatedModule) {
          const latestVersion =
            updatedModule.versions.find((v) => v.id === newVersion.id) ||
            updatedModule.versions[updatedModule.versions.length - 1];
          this.moduleService.currentModuleVersion.set(latestVersion);
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { versionId: latestVersion.id },
            queryParamsHandling: 'merge',
            replaceUrl: true,
          });
          this.messageService.add({
            severity: 'success',
            summary: 'Nouvelle version',
            detail: 'La nouvelle version a été créée et sélectionnée',
          });
        }
      })
      .catch((error) => {
        console.error('Erreur création de la version:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de créer la nouvelle version',
        });
      });
  }

  published() {
    if (this.isReadOnly() || !this.canPublish()) return;
    const versionToUpdate = this.currentVersion();
    if (!versionToUpdate || versionToUpdate.id === undefined) return;

    versionToUpdate.published = !versionToUpdate.published;
    this.loadingPublished.set(true);
    this.httpModuleVersionService
      .updateModuleVersion(versionToUpdate.id!, versionToUpdate)
      .then(() => {
        this.messageService.add({
          severity: 'success',
          summary: 'Version',
          detail: versionToUpdate.published
            ? 'La version a été publiée'
            : 'La version a été rendue privée',
        });
        // Potentially refresh module data or just update local signal if backend confirms
        this.currentVersion.set({ ...versionToUpdate }); // Update local signal immediately
      })
      .catch((err) => {
        versionToUpdate.published = !versionToUpdate.published; // Revert on error
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de changer le statut de publication.',
        });
      })
      .finally(() => this.loadingPublished.set(false));
  }
}

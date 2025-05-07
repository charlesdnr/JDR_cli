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
import { MessageService } from 'primeng/api';
import { UserSavedModule } from '../../classes/UserSavedModule';
import { ModuleVersion } from '../../classes/ModuleVersion';
import { ModuleVersionHttpService } from '../../services/https/module-version-http.service';
import { ModuleService } from '../../services/module.service';
import { GameSystemHttpService } from '../../services/https/game-system-http.service';

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

  foldersName = computed(() => this.folders().map((folder) => folder.name));
  folders: WritableSignal<UserFolder[]> = signal([]);
  selectedFolder = signal<UserFolder | null>(null);

  gameLoading = false;
  folderLoading = false;

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
    if(user){
      this.httpUserSavedModuleService
      .getAllUserSavedModules(user.id)
      .then((savedModules: UserSavedModule[]) => {
        // TODO : changer versions[0] a la vrai version
        const savMod = savedModules.find(
          (save) =>
            save.moduleId === this.currentModule().id &&
            save.moduleVersionId == this.currentModule().versions[0].id
        );
        if(savMod && savMod.folderId){
          this.httpUserFolderService.getUserFolderById(savMod.folderId).then(folder => this.selectedFolder.set(folder))
        }
      });
    }
  }

  saveFolder() {
    this.folderLoading = true;
    this.httpUserSavedModuleService.getSavedModulesByFolder(this.selectedFolder()!.folderId!).then((savedModule: UserSavedModule[]) => {
      this.httpUserSavedModuleService.put(
        new UserSavedModule(
          this.currentUser()!.id,
          this.currentModule().id,
          this.currentModule().versions[0].id!,
          this.selectedFolder()!.folderId!,
          '',
          0
        )
        ,savedModule.find(
          (save) =>
            save.moduleId === this.currentModule().id &&
            save.moduleVersionId == this.currentModule().versions[0].id
        )!.savedModuleId!
      );
      this.messageService.add({ severity: 'success', summary: 'Dossiers', detail: 'Le Module fait maintenant partie du dossier ' + this.selectedFolder()?.name })
    }).catch(() => {
      this.httpUserSavedModuleService.post(
        new UserSavedModule(
          this.currentUser()!.id,
          this.currentModule().id,
          this.currentModule().versions[0].id!,
          this.selectedFolder()!.folderId!,
          '',
          0
        )
      );
      this.messageService.add({ severity: 'success', summary: 'Dossiers', detail: 'Le Module fait maintenant partie du dossier ' + this.selectedFolder()?.name })
    }).finally(() => this.folderLoading = false)

  }

  createNewVersion(){
    this.httpModuleVersionService.createModuleVersion(this.currentModule().id, new ModuleVersion(
      this.currentModule().id,
      this.currentModule().versions.length + 1,
      this.currentUser()!,
      this.currentGameSystem()!.id!,
      false
    )).then(() => {
      this.moduleService.refreshCurrentModule()
      this.messageService.add({ severity: 'success', summary: 'Nouvelle version', detail: 'La nouvelle version a été créée' })
    });
  }

  published(){
    this.currentVersion().published = !this.currentVersion().published
    this.loadingPublished.set(true);
    this.httpModuleVersionService.updateModuleVersion(this.currentVersion().id!,this.currentVersion())
    .then(() => {
      if(this.currentVersion().published){
        this.messageService.add({ severity: 'success', summary: 'Version', detail: 'La version a été publiée' })
      } else {
        this.messageService.add({ severity: 'success', summary: 'Version', detail: 'La version a été rendu privée' })
      }
    })
    .finally(() => this.loadingPublished.set(false))
  }
}

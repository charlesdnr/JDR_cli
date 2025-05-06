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

  // Inputs
  currentModule = input.required<Module>();
  gameSystems = input.required<GameSystem[]>();
  currentUser = input<User | null>(null);
  loadingSave = input<boolean>(false);

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

  async ngOnInit(): Promise<void> {
    await this.loadFolders();
    this.findInUserSavedModule();
    // Si un système de jeu est disponible, le sélectionner par défaut
    if (this.gameSystems().length > 0) {
      this.currentGameSystem.set(this.gameSystems()[0]);
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
    }
  }

  findInUserSavedModule() {
    this.httpUserSavedModuleService
      .getAllUserSavedModules(this.currentUser()!.id)
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

  saveFolder() {
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
    }).catch(err => {
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
    })

  }
}

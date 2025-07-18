import {
  Component,
  computed,
  inject,
  input,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { AvatarGroupModule } from 'primeng/avatargroup';
import { FormsModule } from '@angular/forms';
import { PopoverModule } from 'primeng/popover';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { AccessRight } from '../../enum/AccessRight';
import { ModuleAccess } from '../../classes/ModuleAccess';
import { TooltipModule } from 'primeng/tooltip';
import { ModuleAccessHttpService } from '../../services/https/module-access-http.service';
import { ModuleService } from '../../services/module.service';
import { AutoCompleteCompleteEvent, AutoCompleteModule } from 'primeng/autocomplete';
import { User } from '../../classes/User';
import { UserHttpService } from '../../services/https/user-http.service';
import { UserAvatarService } from '../../services/user-avatar.service';
import { Subject } from 'rxjs';
import { MessageService } from 'primeng/api';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { MultiSelectModule } from 'primeng/multiselect';

@Component({
  selector: 'app-user-avatar-choose',
  imports: [
    AvatarModule,
    AvatarGroupModule,
    FormsModule,
    PopoverModule,
    ButtonModule,
    SelectModule,
    TooltipModule,
    AutoCompleteModule,
    MultiSelectModule
  ],
  templateUrl: './user-avatar-choose.component.html',
  styleUrl: './user-avatar-choose.component.scss',
})
export class UserAvatarChooseComponent implements OnInit, OnDestroy {
  private userService = inject(UserHttpService);
  private userAvatarService = inject(UserAvatarService);
  private httpAccessRightService = inject(ModuleAccessHttpService);
  private moduleService = inject(ModuleService);
  private messageService = inject(MessageService);

  currentUser = computed(() => this.userService.currentJdrUser());
  currentModule = this.moduleService.currentModule;

  label = input<string>("Droit d'accés");
  disabled = input<boolean>(false);
  searchResults = signal<User[]>([]);
  selectedUsers = signal<User[]>([])
  filterText = '';

  accessRightsForUsers = computed(() => {
    const result = new Map<number, string[]>(); // Changement de type ici

    if (this.currentModule()) {
      this.currentModule()!.accesses.forEach(access => {
        const rights: string[] = []; // Changement de type ici
        if (access.canEdit) rights.push(AccessRight.EDIT);
        if (access.canInvite) rights.push(AccessRight.INVITE);
        if (access.canPublish) rights.push(AccessRight.PUBLISH);
        if (access.canView) rights.push(AccessRight.VIEW);

        result.set(access.id!, rights);
      });
    }

    return result;
  });


  getAccessRightsForUser(moduleAccess: ModuleAccess): string[] {
    return this.accessRightsForUsers().get(moduleAccess.id!) || [];
  }

  fourUsers = computed(() => this.selectedUsers().slice(0, 4));
  moreThanFourUser = computed(() => this.selectedUsers().length > 4);

  optionsAccessRight = [
    { value: AccessRight.EDIT, label: 'Modifier' },
    { value: AccessRight.VIEW, label: 'Voir' },
    { value: AccessRight.INVITE, label: 'Invité' },
    { value: AccessRight.PUBLISH, label: 'Publier' },
  ];

  private destroy$ = new Subject<void>();
  loadingListUser = false;

  ngOnInit(): void {
    if (this.currentModule()) {
      const usersWithAccess = this.currentModule()!.accesses.map(
        (access) => access.user
      );
      this.selectedUsers.set(usersWithAccess);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  searchUsers(event: AutoCompleteCompleteEvent): void {
    const query = event.query;

    // Only search if there's a search term
    if (query && query.trim().length > 0) {
      this.loadingListUser = true;

      this.userService.searchUserByEmail(query.trim())
        .subscribe({
          next: (results) => {
            // Filter out already selected users
            const filteredResults = results.filter(user =>
              !this.selectedUsers().some(selected => selected.id === user.id)
            );
            this.searchResults.set(filteredResults);
            this.loadingListUser = false;
          },
          error: (err) => {
            console.error('Error searching users:', err);
            this.searchResults.set([]);
            this.loadingListUser = false;
          }
        });
    } else {
      this.searchResults.set([]);
    }
  }

  onUserSelect(user: User): void {
    // Check if user is already selected
    if (!this.selectedUsers().some(selected => selected.id === user.id)) {
      // Create access right with VIEW by default
      this.createOrUpdateAccessRight(user, AccessRight.VIEW);
    }

    // Clear the search input
    this.filterText = '';
  }

  removeUser(user: User): void {
    // Remove user from selection
    const moduleAcc = this.getModuleAccessByUser(user);
    if (moduleAcc && moduleAcc.id && user !== this.currentUser()) {
      this.httpAccessRightService.deleteModuleAccess(moduleAcc.id).then(() => {
        this.selectedUsers.set(this.selectedUsers().filter(selected => selected.id !== user.id));
        this.currentModule.update(mod => {
          if (!mod) {
            return null;
          }
          const updatedAccesses = mod.accesses.filter(acc => acc.user.id !== user.id);
          return { ...mod, accesses: updatedAccesses };
        });
        this.messageService.add({
          severity: 'success', summary: 'Suppression', detail:
            "L'utilisateur " + user.email + " n'a plus accés a ce module"
        })
      }).catch((err: HttpErrorResponse) => {
        if (err.status == HttpStatusCode.NotFound) {
          this.messageService.add({ severity: 'error', summary: "Erreur", detail: 'Une erreur est survenue : access module introuvable' + "\n L'utilisateur " + user.email + " a toujours accés a ce module" })
        }
      });
    } else if (user !== this.currentUser()) {
      this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Vous ne pouvez pas enlever les droits du créteur du module' })
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getImageForUser(_user: User): string | undefined {
    // Cette méthode est conservée pour compatibilité mais ne retourne plus d'image
    // L'image est gérée via getUserInitials et le template
    return undefined;
  }

  getUserInitials(user: User): string {
    return this.userAvatarService.getUserInitials(user);
  }

  getModuleAccessByUser(user: User): ModuleAccess | undefined {
    return this.currentModule()?.accesses.find(
      (moduleAccess: ModuleAccess) => moduleAccess.user.id === user.id
    );
  }

  getAcessRightEnumValue(moduleAccess: ModuleAccess) {
    if (moduleAccess.canEdit) return AccessRight.EDIT;
    if (moduleAccess.canInvite) return AccessRight.INVITE;
    if (moduleAccess.canPublish) return AccessRight.PUBLISH;
    if (moduleAccess.canView) return AccessRight.VIEW;
    return undefined;
  }


  createOrUpdateAccessRightArray(user: User, accessRight: AccessRight[]) {
    const access = this.getModuleAccessByUser(user);
    const edit = accessRight.some(acc => acc == AccessRight.EDIT);
    const invite = accessRight.some(acc => acc == AccessRight.INVITE);
    const publish = accessRight.some(acc => acc == AccessRight.PUBLISH);
    const view = accessRight.some(acc => acc == AccessRight.VIEW);
    if (access) {
      // si un access right différe des current access right le toggle
      if (access.canEdit !== edit) this.createOrUpdateAccessRight(user, AccessRight.EDIT);
      if (access.canInvite !== invite) this.createOrUpdateAccessRight(user, AccessRight.INVITE);
      if (access.canPublish !== publish) this.createOrUpdateAccessRight(user, AccessRight.PUBLISH);
      if (access.canView !== view) this.createOrUpdateAccessRight(user, AccessRight.VIEW);
    } else {
      // par défaut on lui met view
      this.createOrUpdateAccessRight(user)
    }
  }

  createOrUpdateAccessRight(user: User, accessRight?: AccessRight) {
    const currentMod = this.currentModule();
    if (!currentMod || !currentMod.id) {
      console.error('Aucun module courant ou ID de module trouvé');
      return;
    }

    const moduleAcess = currentMod.accesses.find(
      (moduleAccess: ModuleAccess) => moduleAccess.user.id === user.id
    );

    if (moduleAcess && moduleAcess.id && accessRight) {
      // Mise à jour d'un accès existant
      this.httpAccessRightService
        .toggleAccessRight(moduleAcess.id, accessRight)
        .then((updatedAccess) => {
          this.currentModule.update((moduleUpd) => {
            if (!moduleUpd) return null;

            // Créer une nouvelle copie des accès au lieu de modifier directement
            const newAccesses = [...moduleUpd.accesses];
            const index = newAccesses.findIndex((a) => a.id === updatedAccess.id);

            if (index !== -1) {
              newAccesses[index] = updatedAccess;
            }

            // Retourner un nouvel objet
            return {...moduleUpd, accesses: newAccesses};
          });
        })
        .catch(err => {
          console.error('Erreur lors de la modification des droits:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: "Une erreur est survenue lors de la modification des droits d'accès"
          });
        });
    } else {
      this.httpAccessRightService
        .createModuleAccess(currentMod.id, user.id)
        .then((mod) => {
          // Mettre à jour les deux états en une seule opération
          this.currentModule.update((moduleUpd) => {
            if (!moduleUpd) return null;

            // Créer un nouveau tableau d'accès avec le nouvel élément
            const newAccesses = [...moduleUpd.accesses, mod];

            // Mettre à jour la liste des utilisateurs sélectionnés
            setTimeout(() => {
              this.selectedUsers.set([...this.selectedUsers(), user]);
            }, 0);

            // Afficher le message de succès après la mise à jour
            setTimeout(() => {
              this.messageService.add({
                severity: 'success',
                summary: 'User',
                detail: "L'utilisateur " + user.email + " a maintenant accès à votre module"
              });
            }, 0);

            // Retourner un nouvel objet au lieu de modifier directement
            return {...moduleUpd, accesses: newAccesses};
          });
        })
        .catch(err => {
          console.error('Erreur lors de l\'ajout des droits:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: "Une erreur est survenue lors de l'ajout des droits d'accès"
          });
        });
    }
  }
}

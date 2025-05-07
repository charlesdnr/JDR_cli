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
import { AutoCompleteModule } from 'primeng/autocomplete';
import { User } from '../../classes/User';
import { UserHttpService } from '../../services/https/user-http.service';
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
  private httpAccessRightService = inject(ModuleAccessHttpService);
  private moduleService = inject(ModuleService);
  private messageService = inject(MessageService);

  currentUser = computed(() => this.userService.currentJdrUser());
  currentModule = this.moduleService.currentModule;

  label = input<string>("Droit d'accés");
  searchResults = signal<User[]>([]);
  selectedUsers = signal<User[]>([])
  filterText: string = '';

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

  searchUsers(event: any): void {
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
        console.log(this.currentModule())
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

  getImageForUser(user: User): string | undefined {
    return '';
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
      this.createOrUpdateAccessRight(user, AccessRight.VIEW)
    }
  }

  createOrUpdateAccessRight(user: User, accessRight: AccessRight) {
    const moduleAcess = this.currentModule()?.accesses.find(
      (moduleAccess: ModuleAccess) => moduleAccess.user.id === user.id
    );

    if (moduleAcess && moduleAcess?.id) {
      this.httpAccessRightService
        .toggleAccessRight(moduleAcess.id, accessRight)
        .then((updatedAccess) => {
          // Mettre à jour l'accès dans le module actuel
          this.currentModule.update((moduleUpd) => {
            if (moduleUpd) {
              // Remplacer l'ancien accès par le nouveau
              const index = moduleUpd.accesses.findIndex(
                (a) => a.id === updatedAccess.id
              );
              if (index !== -1) {
                moduleUpd.accesses[index] = updatedAccess;
              }
              this.moduleService.currentModule.set(moduleUpd);
              return moduleUpd;
            } else {
              return null;
            }
          });
        });
    } else {
      this.httpAccessRightService
        .createModuleAccess(this.currentModule()!.id, user.id)
        .then((modd: ModuleAccess) => {
          this.httpAccessRightService
            .toggleAccessRight(modd.id!, accessRight)
            .then((mod) =>
              this.currentModule.update((moduleUpd) => {
                if (moduleUpd) {
                  moduleUpd.accesses.push(mod);
                  this.selectedUsers.set([...this.selectedUsers(), user]);
                  this.moduleService.currentModule.set(moduleUpd);
                  this.messageService.add({ severity: 'success', summary: 'User', detail: "L'utilisateur " + user.email + " a maintenant accés a votre module" })
                  return moduleUpd;
                } else {
                  return null;
                }
              })
            );
        });
    }
  }
}

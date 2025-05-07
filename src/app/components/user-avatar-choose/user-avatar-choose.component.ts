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
  ],
  templateUrl: './user-avatar-choose.component.html',
  styleUrl: './user-avatar-choose.component.scss',
})
export class UserAvatarChooseComponent implements OnInit, OnDestroy {
  private userService = inject(UserHttpService);
  private httpAccessRightService = inject(ModuleAccessHttpService);
  private moduleService = inject(ModuleService);

  currentUser = computed(() => this.userService.currentJdrUser());
  currentModule = this.moduleService.currentModule;

  label = input<string>("Droit d'accés");
  searchResults = signal<User[]>([]);
  selectedUsers: User[] = [];
  filterText: string = '';

  fourUsers = computed(() => this.selectedUsers.slice(0, 4));
  moreThanFourUser = computed(() => this.selectedUsers.length > 4);

  optionsAccessRight = [
    AccessRight.EDIT,
    AccessRight.VIEW,
    AccessRight.INVITE,
    AccessRight.PUBLISH,
  ];

  private destroy$ = new Subject<void>();
  loadingListUser = false;

  ngOnInit(): void {
    if (this.currentModule()) {
      const usersWithAccess = this.currentModule()!.accesses.map(
        (access) => access.user
      );
      this.selectedUsers = [...usersWithAccess];
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
              !this.selectedUsers.some(selected => selected.id === user.id)
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
    if (!this.selectedUsers.some(selected => selected.id === user.id)) {
      // Add to selectedUsers
      this.selectedUsers = [...this.selectedUsers, user];
      // Create access right with VIEW by default
      this.createOrUpdateAccessRight(user, AccessRight.VIEW);
    }

    // Clear the search input
    this.filterText = '';
  }

  removeUser(user: User): void {
    // Remove user from selection
    this.selectedUsers = this.selectedUsers.filter(selected => selected.id !== user.id);

    // Here you could also remove their access rights in the backend if needed
    console.log('User removed:', user);

    // Optional: If you want to remove access rights from backend too
    // this.httpAccessRightService.removeModuleAccess(this.currentModule()!.id, user.id);
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
                  this.moduleService.currentModule.set(moduleUpd);
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

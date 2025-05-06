import {
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { AvatarGroupModule } from 'primeng/avatargroup';
import { MultiSelectModule } from 'primeng/multiselect';
import { User } from '../../classes/User';
import { UserHttpService } from '../../services/https/user-http.service';
import { FormsModule } from '@angular/forms';
import { PopoverModule } from 'primeng/popover';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { AccessRight } from '../../enum/AccessRight';
import { ModuleAccess } from '../../classes/ModuleAccess';
import { TooltipModule } from 'primeng/tooltip';
import { ModuleAccessHttpService } from '../../services/https/module-access-http.service';
import { ModuleService } from '../../services/module.service';

@Component({
  selector: 'app-user-avatar-choose',
  imports: [
    AvatarModule,
    AvatarGroupModule,
    MultiSelectModule,
    FormsModule,
    PopoverModule,
    ButtonModule,
    SelectModule,
    TooltipModule,
  ],
  templateUrl: './user-avatar-choose.component.html',
  styleUrl: './user-avatar-choose.component.scss',
})
export class UserAvatarChooseComponent implements OnInit {
  private userService = inject(UserHttpService);
  private httpAccessRightService = inject(ModuleAccessHttpService);
  private moduleService = inject(ModuleService);

  currentUser = computed(() => this.userService.currentJdrUser());

  currentModule = this.moduleService.currentModule;

  label = input<string>("Droit d'accés");
  users = signal<User[]>([]);
  selectedUsers = signal<User[]>([]);
  fourUsers = computed(() => this.selectedUsers().slice(0, 4));
  moreThanFourUser = computed(() => this.selectedUsers().length > 4);

  optionsAccessRight = [
    AccessRight.EDIT,
    AccessRight.VIEW,
    AccessRight.INVITE,
    AccessRight.PUBLISH,
  ];

  ngOnInit(): void {
    this.userService.getAllUsers().then((users) => {
      this.users.set(users);
      if (this.currentModule()) {
        const usersWithAccess = this.currentModule()!.accesses.map(
          (access) => access.user
        );
        this.selectedUsers.set(usersWithAccess);
      }
    });
  }

  getImageForUser(user: User): string | undefined {
    // const us = userId;
    // console.log(us);

    return '';
  }

  checkEvent(event: User[]) {
    this.createOrUpdateAccessRight(event[event.length - 1], AccessRight.VIEW);
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
              // Mettre à jour dans le localStorage
              this.moduleService.updateCurrentModule(moduleUpd);
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
                  // Mettre à jour dans le localStorage
                  this.moduleService.updateCurrentModule(moduleUpd);
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

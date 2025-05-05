import { Component, computed, effect, inject, input, OnInit, signal } from '@angular/core';
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
import { ModuleAccessHttpService } from '../../services/https/module-access-http.service';
import { ModuleAccess } from '../../classes/ModuleAccess';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-user-avatar-choose',
  imports: [AvatarModule, AvatarGroupModule, MultiSelectModule, FormsModule, PopoverModule, ButtonModule, SelectModule, TooltipModule],
  templateUrl: './user-avatar-choose.component.html',
  styleUrl: './user-avatar-choose.component.scss'
})
export class UserAvatarChooseComponent implements OnInit {
  private userService = inject(UserHttpService);
  private httpAccessRightService = inject(ModuleAccessHttpService);

  currentUser = computed(() => this.userService.currentJdrUser())

  label = input<string>("Droit d'accés");
  moduleId = input.required<number>();
  users = signal<User[]>([]);
  selectedUsers = signal<User[]>([]);
  fourUsers = computed(() => this.selectedUsers().slice(0,4))
  moreThanFourUser = computed(() => this.selectedUsers().length > 4)

  optionsAccessRight = [AccessRight.EDIT, AccessRight.VIEW, AccessRight.INVITE, AccessRight.PUBLISH]
  accessrights = signal<ModuleAccess[]>([]);

  constructor(){
    effect(() => {
      if(this.moduleId() !== 0)
        this.httpAccessRightService.getModuleAccessByModuleId(this.moduleId()).then((moduleAccesse: ModuleAccess[]) => {
          this.accessrights.set(moduleAccesse)
        })
    })
  }

  getModuleAccessByUser(user:User): ModuleAccess | undefined {
    return this.accessrights().find((moduleAccess: ModuleAccess) => moduleAccess.user.id === user.id)
  }

  getAcessRightEnumValue(moduleAccess: ModuleAccess){
    if(moduleAccess.canEdit) return AccessRight.EDIT
    if(moduleAccess.canInvite) return AccessRight.INVITE
    if(moduleAccess.canPublish) return AccessRight.PUBLISH
    if(moduleAccess.canView) return AccessRight.VIEW
    return undefined
  }

  ngOnInit(): void {
    this.userService.getAllUsers().then(users => this.users.set(users))
    if(this.currentUser()!==null)
      this.selectedUsers().push(this.currentUser()!);


  }

  getImageForUser(userId: number): string | undefined {
    // const us = userId;
    // console.log(us);
    return ''
  }

  checkEvent(event: User[]){
    this.createOrUpdateAccessRight(event[event.length-1], AccessRight.VIEW);
  }

  createOrUpdateAccessRight(user: User, accessRight: AccessRight){
    this.httpAccessRightService.getModuleAccessByModuleId(this.moduleId()).then((moduleAccesse: ModuleAccess[]) => {
      const moduleAcess = moduleAccesse.find((moduleAccess: ModuleAccess) => moduleAccess.user.id === user.id)
      if(moduleAcess && moduleAcess?.id){
        this.httpAccessRightService.toggleAccessRight(moduleAcess.id, accessRight)
      } else  {
        this.httpAccessRightService.createModuleAccess(this.moduleId(), user.id).then((modd: ModuleAccess) => {
          this.httpAccessRightService.toggleAccessRight(modd.id!, accessRight).then((mod) => this.accessrights().push(mod))
        });
      }
    })
  }
}

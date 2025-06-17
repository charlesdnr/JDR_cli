import { Component, inject, computed, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { AvatarGroupModule } from 'primeng/avatargroup';
import { AutoCompleteCompleteEvent, AutoCompleteModule } from 'primeng/autocomplete';
import { MultiSelectModule } from 'primeng/multiselect';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { Subject } from 'rxjs';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';

import { Module } from '../../classes/Module';
import { User } from '../../classes/User';
import { ModuleAccess } from '../../classes/ModuleAccess';
import { AccessRight } from '../../enum/AccessRight';
import { UserHttpService } from '../../services/https/user-http.service';
import { UserAvatarService } from '../../services/user-avatar.service';
import { ModuleAccessHttpService } from '../../services/https/module-access-http.service';
import { ModuleService } from '../../services/module.service';

@Component({
  selector: 'app-share-module-dialog',
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    AvatarModule,
    AvatarGroupModule,
    AutoCompleteModule,
    MultiSelectModule,
    TooltipModule
  ],
  template: `
    <div class="share-dialog-content">
      <!-- Header section -->
      <div class="share-header">
        <div class="share-title">
          <i class="pi pi-share-alt"></i>
          <h3>Partager le module</h3>
        </div>
        <div class="share-description">
          <p>Invitez des collaborateurs à travailler sur <strong>{{ moduleData.module.title }}</strong></p>
        </div>
      </div>

      <!-- User search section -->
      <div class="search-section">
        <p-autoComplete
          fluid
          [(ngModel)]="filterText"
          [suggestions]="searchResults()"
          (completeMethod)="searchUsers($event)"
          field="email"
          [dropdown]="true"
          [delay]="300"
          [minLength]="1"
          placeholder="Rechercher et ajouter des utilisateurs par email"
          [showEmptyMessage]="true"
          emptyMessage="Aucun utilisateur trouvé"
          (onSelect)="onUserSelect($event.value)"
          [showClear]="true"
          [disabled]="!moduleData.canInvite"
        >
          <ng-template let-user pTemplate="item">
            <div class="search-result-item">
              <p-avatar [label]="getUserInitials(user)" shape="circle" size="normal" />
              <div class="user-info">
                <div class="user-name">{{ user.username || user.email.split("@")[0] }}</div>
                <div class="user-email">{{ user.email }}</div>
              </div>
            </div>
          </ng-template>
        </p-autoComplete>
      </div>

      <!-- Current collaborators section -->
      <div class="collaborators-section">
        <div class="section-title">
          <i class="pi pi-users"></i>
          <span>Collaborateurs ({{ selectedUsers().length }})</span>
        </div>
        
        @if(selectedUsers().length > 0) {
        <div class="collaborators-list">
          @for(user of selectedUsers(); track user){
          <div class="collaborator-item">
            <div class="collaborator-info">
              <p-avatar
                [label]="getUserInitials(user)"
                size="normal"
                shape="circle"
              />
              <div class="user-details">
                <span class="user-name">{{ user.username || user.email.split("@")[0] }}</span>
                <span class="user-email">{{ user.email }}</span>
                @if(user.id === moduleData.module.creator.id) {
                <span class="creator-badge">Créateur</span>
                }
              </div>
            </div>

            <div class="collaborator-actions">
              @let $moduleAccess = getModuleAccessByUser(user); @if($moduleAccess){
              <p-multiselect
                [options]="optionsAccessRight"
                [ngModel]="getAccessRightsForUser($moduleAccess)"
                (ngModelChange)="createOrUpdateAccessRightArray(user, $event)"
                optionValue="value"
                optionLabel="label"
                [showClear]="false"
                [showToggleAll]="false"
                [showHeader]="false"
                [disabled]="user.id === moduleData.module.creator.id || !moduleData.canInvite"
                placeholder="Droits d'accès"
                styleClass="permissions-select"
              />
              }
              @if(user.id !== moduleData.module.creator.id && moduleData.canInvite){
              <p-button
                icon="pi pi-trash"
                severity="danger"
                [text]="true"
                size="small"
                (onClick)="removeUser(user)"
                pTooltip="Retirer l'accès"
                tooltipPosition="top"
              />
              }
            </div>
          </div>
          }
        </div>
        } @else {
        <div class="no-collaborators">
          <i class="pi pi-users"></i>
          <p>Aucun collaborateur pour le moment</p>
          <small>Utilisez la recherche ci-dessus pour inviter des utilisateurs</small>
        </div>
        }
      </div>

      <!-- Actions section -->
      <div class="dialog-actions">
        <p-button 
          label="Fermer"
          severity="secondary"
          [outlined]="true"
          (onClick)="close()"
        />
      </div>
    </div>
  `,
  styles: [`
    .share-dialog-content {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      max-width: 600px;
      min-height: 400px;
    }

    .share-header {
      .share-title {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 0.75rem;
        
        i {
          color: var(--primary-color);
          font-size: 1.25rem;
        }
        
        h3 {
          margin: 0;
          color: var(--font-color);
          font-size: 1.25rem;
          font-weight: 600;
        }
      }
      
      .share-description {
        p {
          margin: 0;
          padding: 1rem;
          background: rgba(0, 149, 255, 0.1);
          border-radius: 8px;
          color: var(--font-color);
          font-size: 0.9rem;
          line-height: 1.4;
          border-left: 3px solid var(--primary-color);

          strong {
            color: var(--primary-color);
            font-weight: 600;
          }
        }
      }
    }

    .search-section {
      .search-result-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.5rem;
        
        .user-info {
          flex: 1;
          
          .user-name {
            font-weight: 500;
            color: var(--font-color);
            font-size: 0.9rem;
          }
          
          .user-email {
            color: rgba(97, 117, 136, 1);
            font-size: 0.8rem;
            margin-top: 0.2rem;
          }
        }
      }
    }

    .collaborators-section {
      .section-title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1rem;
        font-weight: 600;
        color: var(--font-color);
        
        i {
          color: var(--primary-color);
        }
      }
      
      .collaborators-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        
        .collaborator-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          background: rgba(97, 117, 136, 0.05);
          border-radius: 8px;
          border: 1px solid rgba(97, 117, 136, 0.1);
          transition: all 0.2s ease;
          
          &:hover {
            background: rgba(97, 117, 136, 0.08);
          }
          
          .collaborator-info {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            flex: 1;
            min-width: 0;
            
            .user-details {
              display: flex;
              flex-direction: column;
              min-width: 0;
              
              .user-name {
                font-weight: 500;
                color: var(--font-color);
                font-size: 0.9rem;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
              
              .user-email {
                color: rgba(97, 117, 136, 1);
                font-size: 0.8rem;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
              
              .creator-badge {
                display: inline-block;
                background: var(--primary-color);
                color: white;
                font-size: 0.7rem;
                font-weight: 500;
                padding: 0.2rem 0.5rem;
                border-radius: 12px;
                margin-top: 0.25rem;
                width: fit-content;
              }
            }
          }
          
          .collaborator-actions {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            min-width: 200px;
            justify-content: flex-end;
          }
        }
      }
      
      .no-collaborators {
        text-align: center;
        padding: 2rem;
        color: rgba(97, 117, 136, 1);
        
        i {
          font-size: 2rem;
          margin-bottom: 0.75rem;
          opacity: 0.6;
        }
        
        p {
          margin: 0 0 0.5rem 0;
          font-weight: 500;
        }
        
        small {
          opacity: 0.8;
        }
      }
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      padding-top: 1rem;
      border-top: 1px solid rgba(97, 117, 136, 0.2);
    }

    /* Global styles for this component */
    ::ng-deep .permissions-select {
      min-width: 150px;
      
      .p-multiselect-label {
        font-size: 0.85rem;
      }
    }
  `]
})
export class ShareModuleDialogComponent implements OnInit, OnDestroy {
  private dialogRef = inject(DynamicDialogRef);
  private config = inject(DynamicDialogConfig);
  private userService = inject(UserHttpService);
  private userAvatarService = inject(UserAvatarService);
  private httpAccessRightService = inject(ModuleAccessHttpService);
  private moduleService = inject(ModuleService);
  private messageService = inject(MessageService);

  moduleData = this.config.data as {
    module: Module;
    currentUser: User;
    canInvite: boolean;
  };

  currentUser = computed(() => this.userService.currentJdrUser());
  currentModule = this.moduleService.currentModule;
  
  searchResults = signal<User[]>([]);
  selectedUsers = signal<User[]>([]);
  filterText = '';
  loadingListUser = false;
  
  private destroy$ = new Subject<void>();

  accessRightsForUsers = computed(() => {
    const result = new Map<number, string[]>();

    if (this.moduleData.module) {
      this.moduleData.module.accesses.forEach(access => {
        const rights: string[] = [];
        if (access.canEdit) rights.push(AccessRight.EDIT);
        if (access.canInvite) rights.push(AccessRight.INVITE);
        if (access.canPublish) rights.push(AccessRight.PUBLISH);
        if (access.canView) rights.push(AccessRight.VIEW);

        result.set(access.id!, rights);
      });
    }

    return result;
  });

  optionsAccessRight = [
    { value: AccessRight.EDIT, label: 'Modifier' },
    { value: AccessRight.VIEW, label: 'Voir' },
    { value: AccessRight.INVITE, label: 'Invité' },
    { value: AccessRight.PUBLISH, label: 'Publier' },
  ];

  ngOnInit(): void {
    if (this.moduleData.module) {
      const usersWithAccess = this.moduleData.module.accesses.map(
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

    if (query && query.trim().length > 0) {
      this.loadingListUser = true;

      this.userService.searchUserByEmail(query.trim())
        .subscribe({
          next: (results) => {
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
    if (!this.selectedUsers().some(selected => selected.id === user.id)) {
      this.createOrUpdateAccessRight(user, AccessRight.VIEW);
    }
    this.filterText = '';
  }

  removeUser(user: User): void {
    const moduleAcc = this.getModuleAccessByUser(user);
    if (moduleAcc && moduleAcc.id && user !== this.currentUser()) {
      this.httpAccessRightService.deleteModuleAccess(moduleAcc.id).then(() => {
        this.selectedUsers.set(this.selectedUsers().filter(selected => selected.id !== user.id));
        
        // Update the module data
        this.moduleData.module.accesses = this.moduleData.module.accesses.filter(acc => acc.user.id !== user.id);
        
        // Update the global module state if it's the same module
        if (this.currentModule()?.id === this.moduleData.module.id) {
          this.currentModule.update(mod => {
            if (!mod) return null;
            const updatedAccesses = mod.accesses.filter(acc => acc.user.id !== user.id);
            return { ...mod, accesses: updatedAccesses };
          });
        }
        
        this.messageService.add({
          severity: 'success', 
          summary: 'Suppression', 
          detail: "L'utilisateur " + user.email + " n'a plus accès à ce module"
        });
      }).catch((err: HttpErrorResponse) => {
        if (err.status == HttpStatusCode.NotFound) {
          this.messageService.add({ 
            severity: 'error', 
            summary: "Erreur", 
            detail: 'Une erreur est survenue : accès module introuvable\nL\'utilisateur ' + user.email + ' a toujours accès à ce module' 
          });
        }
      });
    } else if (user === this.currentUser()) {
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Erreur', 
        detail: 'Vous ne pouvez pas enlever les droits du créateur du module' 
      });
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
    return this.moduleData.module?.accesses.find(
      (moduleAccess: ModuleAccess) => moduleAccess.user.id === user.id
    );
  }

  getAccessRightsForUser(moduleAccess: ModuleAccess): string[] {
    return this.accessRightsForUsers().get(moduleAccess.id!) || [];
  }

  createOrUpdateAccessRightArray(user: User, accessRight: AccessRight[]) {
    const access = this.getModuleAccessByUser(user);
    const edit = accessRight.some(acc => acc == AccessRight.EDIT);
    const invite = accessRight.some(acc => acc == AccessRight.INVITE);
    const publish = accessRight.some(acc => acc == AccessRight.PUBLISH);
    const view = accessRight.some(acc => acc == AccessRight.VIEW);
    
    if (access) {
      if (access.canEdit !== edit) this.createOrUpdateAccessRight(user, AccessRight.EDIT);
      if (access.canInvite !== invite) this.createOrUpdateAccessRight(user, AccessRight.INVITE);
      if (access.canPublish !== publish) this.createOrUpdateAccessRight(user, AccessRight.PUBLISH);
      if (access.canView !== view) this.createOrUpdateAccessRight(user, AccessRight.VIEW);
    } else {
      this.createOrUpdateAccessRight(user);
    }
  }

  createOrUpdateAccessRight(user: User, accessRight?: AccessRight) {
    const currentMod = this.moduleData.module;
    if (!currentMod || !currentMod.id) {
      console.error('Aucun module courant ou ID de module trouvé');
      return;
    }

    const moduleAccess = currentMod.accesses.find(
      (moduleAccess: ModuleAccess) => moduleAccess.user.id === user.id
    );

    if (moduleAccess && moduleAccess.id && accessRight) {
      // Update existing access
      this.httpAccessRightService
        .toggleAccessRight(moduleAccess.id, accessRight)
        .then((updatedAccess) => {
          // Update module data
          const index = this.moduleData.module.accesses.findIndex(a => a.id === updatedAccess.id);
          if (index !== -1) {
            this.moduleData.module.accesses[index] = updatedAccess;
          }
          
          // Update global module state if it's the same module
          if (this.currentModule()?.id === this.moduleData.module.id) {
            this.currentModule.update((moduleUpd) => {
              if (!moduleUpd) return null;
              const newAccesses = [...moduleUpd.accesses];
              const index = newAccesses.findIndex((a) => a.id === updatedAccess.id);
              if (index !== -1) {
                newAccesses[index] = updatedAccess;
              }
              return {...moduleUpd, accesses: newAccesses};
            });
          }
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
      // Create new access
      this.httpAccessRightService
        .createModuleAccess(currentMod.id, user.id)
        .then((newAccess) => {
          // Update module data
          this.moduleData.module.accesses.push(newAccess);
          
          // Update selected users
          this.selectedUsers.set([...this.selectedUsers(), user]);
          
          // Update global module state if it's the same module
          if (this.currentModule()?.id === this.moduleData.module.id) {
            this.currentModule.update((moduleUpd) => {
              if (!moduleUpd) return null;
              const newAccesses = [...moduleUpd.accesses, newAccess];
              return {...moduleUpd, accesses: newAccesses};
            });
          }
          
          this.messageService.add({
            severity: 'success',
            summary: 'Utilisateur ajouté',
            detail: "L'utilisateur " + user.email + " a maintenant accès à votre module"
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

  close(): void {
    this.dialogRef.close();
  }
}
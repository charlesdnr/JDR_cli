import { Component, computed, inject, input, model, OnInit, signal } from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { AvatarGroupModule } from 'primeng/avatargroup';
import { MultiSelectModule } from 'primeng/multiselect';
import { User } from '../../classes/User';
import { UserHttpService } from '../../services/https/user-http.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-user-avatar-choose',
  imports: [AvatarModule, AvatarGroupModule, MultiSelectModule, FormsModule],
  templateUrl: './user-avatar-choose.component.html',
  styleUrl: './user-avatar-choose.component.scss'
})
export class UserAvatarChooseComponent implements OnInit {
  private userService = inject(UserHttpService);

  label = input<string>("Droit d'accés");
  users = signal<User[]>([]);
  selectedUsers = model<User[]>([]);

  fourUsers = computed(() => this.selectedUsers().slice(0,4))

  moreThanFourUser = computed(() => this.selectedUsers().length > 4)

  ngOnInit(): void {
    this.userService.getAllUsers().then(users => this.users.set(users))
  }

  getImageForUser(userId: number): string | undefined {
    return ''
  }
}

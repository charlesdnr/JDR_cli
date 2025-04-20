import { Component, computed, inject } from '@angular/core';
import { UserHttpService } from '../../services/https/user-http.service';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { MessageService } from 'primeng/api';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Auth, deleteUser } from '@angular/fire/auth';

@Component({
  selector: 'app-account',
  imports: [
    CommonModule,
    TranslateModule,
    ReactiveFormsModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    AvatarModule
  ],
  templateUrl: './account.component.html',
  styleUrl: './account.component.scss'
})
export class AccountComponent {
  private userService = inject(UserHttpService);
  private messageService = inject(MessageService);
  private router = inject(Router);
  private auth = inject(Auth);

  formgroupPassword = new FormGroup({
    password: new FormControl('', [Validators.required]),
    confirm: new FormControl('', [Validators.required])
  });

  currentUser = computed(() => this.userService.currentJdrUser())

  saveUser() {
    const user = this.currentUser()
    if(!user?.id) return
    this.userService.put(this.currentUser(), user.id).then(() => {
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Sauvegarder avec succés',
      });
    }).catch((err: HttpErrorResponse) =>
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: `Error : ${err.message}`,
      })
    );
  }

  uploadPhoto() {
    console.log('Upload Photo clicked');
  }

  deletePhoto() {
    console.log('Delete Photo clicked');
  }

  changePassword() {
    console.log('Change Password clicked');
  }

  async deleteAccount() {
    const currentUser = this.auth.currentUser;
    if (currentUser) {
      try {
        const user = this.currentUser()
        if(!user?.id) return
        await this.userService.delete(user.id)
        await deleteUser(currentUser)
        this.userService.currentJdrUser.set(null);
        this.router.navigateByUrl('/home');
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Supprimer avec succés',
        });
      } catch (error: any) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Error : ${error.message}`,
        })
      }

    }
  }
}
import { Component, computed, inject, OnInit, signal } from '@angular/core';
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
import { Auth, deleteUser, sendPasswordResetEmail } from '@angular/fire/auth';
import { Dialog } from 'primeng/dialog';
import { PasswordModule } from 'primeng/password';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-account',
  imports: [
    CommonModule,
    TranslateModule,
    ReactiveFormsModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    Dialog,
    AvatarModule,
    PasswordModule,
    InputGroupModule,
    InputGroupAddonModule,
    TooltipModule
  ],
  templateUrl: './account.component.html',
  styleUrl: './account.component.scss'
})
export class AccountComponent implements OnInit {
  private userService = inject(UserHttpService);
  private messageService = inject(MessageService);
  private router = inject(Router);
  private auth = inject(Auth);

  formgroupPassword = new FormGroup({
    password: new FormControl('', [Validators.required]),
    confirm: new FormControl('', [Validators.required])
  });

  originalUsername = signal('');
  hasChanges = computed(() => {
    console.log(this.originalUsername())
    const username = this.currentUser()?.username;
    return username !== this.originalUsername();
  });


  showPasswordResetDialog = signal(false);
  resetPasswordEmail = signal('');
  sendingEmail = signal(false);

  currentUser = computed(() => this.userService.currentJdrUser())
  // loading = signal(false)

  ngOnInit() {
    const user = this.currentUser();
    if (user?.username) {
      this.originalUsername.set(user.username);
    }
  }

  saveUser() {
    const user = this.currentUser()
    if(!user?.id) return
    this.userService.put(this.currentUser(), user.id).then(() => {
      // Mettre à jour l'username original après sauvegarde
      if (user?.username) {
        this.originalUsername.set(user.username);
      }
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

  changePassword() {
    const user = this.currentUser();
    if (user?.email) {
      this.resetPasswordEmail.set(user.email);
      this.showPasswordResetDialog.set(true);
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Avertissement',
        detail: 'Aucune adresse email associée à votre compte'
      });
    }
  }

  async sendPasswordResetEmail() {
    this.sendingEmail.set(true);
    try {
      await sendPasswordResetEmail(this.auth, this.resetPasswordEmail());
      this.messageService.add({
        severity: 'success',
        summary: 'Succès',
        detail: 'Email de réinitialisation envoyé avec succès'
      });
      this.showPasswordResetDialog.set(false);
    } catch (error: any) {
      let errorMessage = 'Une erreur est survenue';

      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'Aucun utilisateur trouvé avec cette adresse email';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Adresse email invalide';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Trop de tentatives. Réessayez plus tard';
          break;
        default:
          errorMessage = error.message;
      }

      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: errorMessage
      });
    } finally {
      this.sendingEmail.set(false);
    }
  }

  uploadPhoto() {
    console.log('Upload Photo clicked');
  }

  deletePhoto() {
    console.log('Delete Photo clicked');
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
      } catch (error: unknown) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Error : ${error}`,
        })
      }

    }
  }
}

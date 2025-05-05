import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  Auth,
  verifyPasswordResetCode,
  confirmPasswordReset,
} from '@angular/fire/auth';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { MessageService } from 'primeng/api';
import { passwordMatchValidator } from '../../validators/equalPattern';

@Component({
  selector: 'app-password-reset',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    InputTextModule,
    ButtonModule,
    PasswordModule,
    RouterLink,
  ],
  templateUrl: './password-reset.component.html',
  styleUrl: './password-reset.component.scss',
})
export class PasswordResetComponent implements OnInit {
  private auth = inject(Auth);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private messageService = inject(MessageService);

  oobCode = signal<string>('');
  email = signal<string>('');
  verifying = signal(true);
  invalidCode = signal(false);
  resetting = signal(false);

  resetForm = new FormGroup(
    {
      password: new FormControl('', [
        Validators.required,
      ]),
      confirm: new FormControl('', [Validators.required]),
    },
    { validators: passwordMatchValidator }
  );

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      const oobCode = params['oobCode'];

      if (oobCode) {
        this.oobCode.set(oobCode);
        this.verifyCode();
      } else {
        this.invalidCode.set(true);
        this.verifying.set(false);
      }
    });
  }

  async verifyCode() {
    try {
      const email = await verifyPasswordResetCode(this.auth, this.oobCode());
      this.email.set(email);
      this.verifying.set(false);
    } catch (error) {
      console.error('Error verifying code:', error);
      this.invalidCode.set(true);
      this.verifying.set(false);
    }
  }

  async resetPassword() {
    if (!this.resetForm.valid) return;

    this.resetting.set(true);
    try {
      await confirmPasswordReset(
        this.auth,
        this.oobCode(),
        this.resetForm.get('password')?.value || ''
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Succès',
        detail: 'Mot de passe réinitialisé avec succès',
      });

      setTimeout(() => {
        this.router.navigate(['/auth/login']);
      }, 2000);
    } catch (error: any) {
      console.error('Error resetting password:', error);

      let errorMessage = 'Une erreur est survenue';

      switch (error.code) {
        case 'auth/expired-action-code':
          errorMessage = 'Le lien a expiré';
          break;
        case 'auth/invalid-action-code':
          errorMessage = 'Le lien est invalide';
          break;
        case 'auth/weak-password':
          errorMessage = 'Le mot de passe est trop faible';
          break;
        default:
          errorMessage = error.message;
      }

      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: errorMessage,
      });
    } finally {
      this.resetting.set(false);
    }
  }
}

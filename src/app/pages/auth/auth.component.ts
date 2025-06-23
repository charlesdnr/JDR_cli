import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { AuthHttpService } from '../../services/https/auth-http.service';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { FloatLabelModule } from 'primeng/floatlabel';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { User } from '../../classes/User';
import { KeyFilterModule } from 'primeng/keyfilter';
import { Subscription } from 'rxjs';
import { passwordMatchValidator } from '../../validators/equalPattern';
import { MessageService } from 'primeng/api';
import { UserHttpService } from '../../services/https/user-http.service';
import { UserCredential } from '@angular/fire/auth';

@Component({
  selector: 'app-auth',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    CommonModule,
    InputTextModule,
    PasswordModule,
    FloatLabelModule,
    TranslateModule,
    KeyFilterModule,
    RouterLink,
  ],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss',
})
export class AuthComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private httpAuth = inject(AuthHttpService);
  private httpUser = inject(UserHttpService);
  private messageService = inject(MessageService);

  config = signal('');
  isLogin = computed(() => this.config() == 'login');
  formgroup = computed(() => {
    if (this.isLogin()) {
      return new FormGroup({
        email: new FormControl('', [Validators.required, Validators.email]),
        password: new FormControl('', Validators.required),
      });
    }
    return new FormGroup(
      {
        login: new FormControl('', Validators.required),
        password: new FormControl('', [Validators.required, Validators.minLength(6)]),
        confirm: new FormControl('', Validators.required),
        email: new FormControl('', [Validators.email, Validators.required]),
      },
      { validators: passwordMatchValidator }
    );
  });
  labelButton = computed(() =>
    this.isLogin() ? 'Connexion' : "S'enregistrer"
  );
  labelButton2 = computed(() =>
    !this.isLogin() ? 'Se connecter' : "S'enregistrer"
  );
  labelh2 = computed(() => (this.isLogin() ? 'Connexion' : "S'enregistrer"));
  noAccountLabel = computed(() =>
    this.isLogin() ? 'Pas de compte ?' : 'Déjà un compte ?'
  );

  loading = signal(false);
  loadingGoogle = signal(false);
  loadingGithub = signal(false);
  errorMessage = signal<string>('');

  // Computed pour éviter les erreurs de type dans le template
  loginControl = computed(() => {
    const form = this.formgroup();
    return form.controls['login' as keyof typeof form.controls] || null;
  });
  emailControl = computed(() => {
    const form = this.formgroup();
    return form.controls['email' as keyof typeof form.controls] || null;
  });
  passwordControl = computed(() => {
    const form = this.formgroup();
    return form.controls['password' as keyof typeof form.controls] || null;
  });
  confirmControl = computed(() => {
    const form = this.formgroup();
    return form.controls['confirm' as keyof typeof form.controls] || null;
  });

  private routeSubscription!: Subscription;

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }

  ngOnInit(): void {
    this.routeSubscription = this.route.params.subscribe((param) => {
      this.config.set(param['config']);
    });
  }

  formSubmit() {
    this.errorMessage.set('');
    
    if (this.formgroup().valid) {
      const user: User = new User(
        this.formgroup().value.email!,
        this.formgroup().value.password!
      );
      if (this.isLogin()) {
        this.loginUser(user);
      } else {
        this.loading.set(true);
        this.httpAuth
          .signup(user.email, user.password)
          .then(() => {
            this.loginUser(user);
          })
          .catch((err) => {
            console.error(err);
            this.handleAuthError(err);
            this.loading.set(false);
          });
      }
    } else {
      this.markAllFieldsAsTouched();
    }
  }

  loginUser(user: User) {
    this.loading.set(true);
    this.httpAuth
      .login(user.email, user.password)
      .then(async (value) => {
        await this.checkOurLogin(value);
      })
      .catch((err: unknown) => {
        this.handleAuthError(err);
        this.loading.set(false);
      });
  }

  loginGoogle() {
    this.loadingGoogle.set(true);
    this.errorMessage.set('');
    this.httpAuth
      .loginGoogle()
      .then(async (value) => {
        await this.checkOurLogin(value);
      })
      .catch((err: unknown) => {
        this.handleAuthError(err);
        this.loadingGoogle.set(false);
      });
  }

  loginGithub() {
    this.loadingGithub.set(true);
    this.errorMessage.set('');
    this.httpAuth
      .loginGithub()
      .then(async (value) => {
        await this.checkOurLogin(value);
      })
      .catch((err: unknown) => {
        this.handleAuthError(err);
        this.loadingGithub.set(false);
      });
  }

  async checkOurLogin(value: UserCredential) {
    if (this.isLogin() && value.user.email) {
      try {
        const email = value.user.email;
        const resp = await this.httpUser.getUserByEmail(email);
        this.httpUser.currentJdrUser.set(resp);
        this.router.navigateByUrl('/home');
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Connecté en tant que ' + value.user.email,
        });
      } catch (error) {
        this.handleAuthError(error);
      } finally {
        this.resetLoadingStates();
      }
    } else if (!this.isLogin()) {
      try {
        const email = value.user.email;
        const username = (this.formgroup().value as { login:string }).login;
        const resp: User = await this.httpUser.post({ email: email, username: username });
        this.httpUser.currentJdrUser.set(resp);
        this.router.navigateByUrl('/home');
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Compte créé et connecté en tant que ' + value.user.email,
        });
      } catch (error) {
        this.handleAuthError(error);
      } finally {
        this.resetLoadingStates();
      }
    }
  }

  private resetLoadingStates() {
    this.loading.set(false);
    this.loadingGoogle.set(false);
    this.loadingGithub.set(false);
  }

  private handleAuthError(error: unknown) {
    let errorMessage = 'Une erreur inattendue s\'est produite';
    
    if (error && typeof error === 'object' && 'code' in error) {
      const firebaseError = error as { code: string; message?: string };
      switch (firebaseError.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          errorMessage = 'Email ou mot de passe incorrect';
          break;
        case 'auth/email-already-in-use':
          errorMessage = 'Cette adresse email est déjà utilisée';
          break;
        case 'auth/weak-password':
          errorMessage = 'Le mot de passe doit contenir au moins 6 caractères';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Format d\'email invalide';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Problème de connexion réseau';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Trop de tentatives. Veuillez réessayer plus tard';
          break;
        case 'auth/popup-closed-by-user':
          errorMessage = 'Connexion annulée';
          break;
        default:
          errorMessage = firebaseError.message || errorMessage;
      }
    } else if (error && typeof error === 'object' && 'message' in error) {
      const errorWithMessage = error as { message: string };
      errorMessage = errorWithMessage.message;
    }

    this.errorMessage.set(errorMessage);
    this.messageService.add({
      severity: 'error',
      summary: 'Erreur',
      detail: errorMessage,
    });
  }

  private markAllFieldsAsTouched() {
    const form = this.formgroup();
    Object.keys(form.controls).forEach(key => {
      const control = form.controls[key as keyof typeof form.controls];
      control?.markAsTouched();
    });
  }
}

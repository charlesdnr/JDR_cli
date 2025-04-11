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
import { HttpErrorResponse } from '@angular/common/http';
// import { GooglSsoDirective } from '../../directives/googl-sso.directive';

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
    // GooglSsoDirective,
  ],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss',
})
export class AuthComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  config = signal('');
  isLogin = computed(() => this.config() == 'login');
  formgroup = computed(() => {
    if (this.isLogin()) {
      return new FormGroup({
        email: new FormControl(''),
        password: new FormControl(''),
      });
    }
    return new FormGroup(
      {
        login: new FormControl('', Validators.required),
        password: new FormControl('', Validators.required),
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
    !this.isLogin() ? 'Se Connecter' : "S'enregistrer"
  );
  labelh2 = computed(() => (this.isLogin() ? 'Connexion' : "S'enregistrer"));
  noAccountLabel = computed(() =>
    this.isLogin() ? 'Pas de compte ?' : 'Déjà un compte ?'
  );

  private routeSubscription!: Subscription;

  constructor(
    private httpAuth: AuthHttpService,
    private messageService: MessageService
  ) {}

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }

  ngOnInit(): void {
    this.routeSubscription = this.route.params.subscribe((param) => {
      this.config.set(param['config']);
    });
  }

  formSubmit() {
    if (this.formgroup().valid) {
      const user: User = new User(
        this.formgroup().value.email!,
        this.formgroup().value.password!
      );
      if (this.isLogin()) {
        this.loginUser(user);
      } else {
        this.httpAuth
          .signup(user.email, user.password, {})
          .then(() => {
            this.loginUser(user);
          })
          .catch((err) => console.error(err));
      }
    }
  }

  loginUser(user: User) {
    this.httpAuth
      .login(user.email, user.password)
      .then((value) => {
        this.router.navigateByUrl('/home');
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Connecté en tant que ' + value.user.email,
        });
      })
      .catch((err: HttpErrorResponse) =>
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Error : ${err.message}`,
        })
      );
  }

  loginGoogle() {
    this.httpAuth
      .loginGoogle()
      .then((value) => {
        this.router.navigateByUrl('/home');
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Connecté en tant que ' + value.user.email,
        });
      })
      .catch((err) => console.log(err));
  }
}

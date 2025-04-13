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
    !this.isLogin() ? 'Se connecter' : "S'enregistrer"
  );
  labelh2 = computed(() => (this.isLogin() ? 'Connexion' : "S'enregistrer"));
  noAccountLabel = computed(() =>
    this.isLogin() ? 'Pas de compte ?' : 'Déjà un compte ?'
  );

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
      .then(async (value) => {
        await this.checkOurLogin(value)
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
      .then(async (value) => {
        await this.checkOurLogin(value)
      })
      .catch((err) => console.log(err));
  }

  loginGithub() {
    this.httpAuth
      .loginGithub()
      .then(async (value) => {
        await this.checkOurLogin(value)
      })
      .catch((err) => console.log(err));
  }

  async checkOurLogin(value: UserCredential){
    if (this.isLogin() && value.user.email) {
      try {
        const email = value.user.email;
        const resp = await this.httpUser.getUserByEmail(email);
        console.log(resp)
        this.router.navigateByUrl('/home');
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Connecté en tant que ' + value.user.email,
        });
      } catch (err) {
        console.log('erreur : ', err)
      }
    } else if (!this.isLogin()){
      try {
        const email = value.user.email;
        const username = (this.formgroup().value as any).login;
        console.log(email, username);

        const resp = await this.httpUser.post({ email: email, username: username });
        console.log(resp)
        this.router.navigateByUrl('/home');
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Connecté en tant que ' + value.user.email,
        });
      } catch (err) {
        console.log('erreur : ', err)
      }
    }
  }
}

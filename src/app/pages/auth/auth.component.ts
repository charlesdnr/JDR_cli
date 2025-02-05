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
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { User } from '../../classes/User';
import { KeyFilterModule } from 'primeng/keyfilter';
import { Subscription } from 'rxjs';
import { passwordMatchValidator } from '../../validators/equalPattern';
import { MessageService } from 'primeng/api';
import { HttpErrorResponse } from '@angular/common/http';

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
  config = signal('');
  isLogin = computed(() => this.config() == 'login');
  formgroup = computed(() => {
    if (this.isLogin()) {
      return new FormGroup({
        login: new FormControl(''),
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
    this.isLogin() ? 'Se Connecter' : "S'enregistrer"
  );
  labelh2 = computed(() => (this.isLogin() ? 'Connexion' : "S'enregistrer"));
  noAccountLabel = computed(() =>
    this.isLogin() ? 'Pas de compte ?' : 'Déjà un compte ?'
  );

  private routeSubscription!: Subscription;

  constructor(private httpAuth: AuthHttpService, private messageService: MessageService) {}

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
        this.formgroup().value.login!,
        this.formgroup().value.password!
      );
      console.log(this.formgroup().value);
      console.log(user);
      if (this.isLogin()) {
        this.loginUser(user);
      } else {
        this.httpAuth
          .register(user)
          .then(() => {
            this.loginUser(user);
          })
          .catch((err) => console.error(err));
      }
    }
  }

  loginUser(user: User) {
    this.httpAuth.login(user).then((value) => {
      this.router.navigateByUrl('/home');
      localStorage.setItem('token', value.token);
      this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Succesfully login' });
    }).catch((err: HttpErrorResponse) => this.messageService.add({ severity: 'error', summary: 'Error', detail: `Error : ${err.message}` }));
  }
}

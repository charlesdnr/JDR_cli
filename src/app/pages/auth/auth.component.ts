import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { AuthHttpService } from '../../services/https/auth-http.service';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { FloatLabelModule } from 'primeng/floatlabel';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ActivatedRoute } from '@angular/router';


@Component({
  selector: 'app-auth',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    CommonModule,
    InputTextModule,
    PasswordModule,
    FloatLabelModule,
    TranslateModule
  ],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss'
})
export class AuthComponent implements OnInit {
  private route = inject(ActivatedRoute);
  config = signal(this.route.snapshot.params['config']);
  isLogin = computed(() => this.config() == "login");

  formgroup: FormGroup = new FormGroup({})
  labelButton = this.isLogin() ? "Se Connecter" : "S'enregistrer";
  labelh2 = this.isLogin() ? "Connexion" : "S'enregistrer"
  noAccountLabel = this.isLogin() ? "Pas de compte ?" : "Déjà un compte ?"

  constructor(private httpAuth: AuthHttpService){}

  ngOnInit(): void {
    this.formgroup = new FormGroup({
     login: new FormControl({}),
     password: new FormControl({})
    })
    this.formgroup.get('login')?.setValue('')
    this.formgroup.get('password')?.setValue('')
  }

  login(){
    //const user = this.formgroup.value
    //this.httpAuth.login(user)
  }
}

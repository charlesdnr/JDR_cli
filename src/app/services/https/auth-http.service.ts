import { Injectable } from '@angular/core';
import { defer, firstValueFrom, Observable } from 'rxjs';
import { Auth } from '@angular/fire/auth';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from '@firebase/auth';

@Injectable({
  providedIn: 'root',
})
export class AuthHttpService {
  constructor(private auth: Auth) {}

  login(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }
  // the sign up uses createUserWithEmailAndPassword
  signup(email: string, password: string, custom: any) {
    return createUserWithEmailAndPassword(this.auth, email, password);
  }
  loginGoogle() {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(this.auth, provider);
  }
}

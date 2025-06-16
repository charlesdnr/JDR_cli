import { inject, Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  createUserWithEmailAndPassword,
  GithubAuthProvider,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from '@firebase/auth';
import { UserHttpService } from './user-http.service';

@Injectable({
  providedIn: 'root',
})
export class AuthHttpService {
  private userService = inject(UserHttpService);

  constructor(private auth: Auth) {}

  login(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }
  // the sign up uses createUserWithEmailAndPassword
  signup(email: string, password: string) {
    return createUserWithEmailAndPassword(this.auth, email, password);
  }
  loginGoogle() {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(this.auth, provider);
  }
  loginGithub() {
    const provider = new GithubAuthProvider();
    return signInWithPopup(this.auth, provider);
  }
  async logout(){
    await this.auth.signOut()
  }
}

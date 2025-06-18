import { Injectable, inject } from '@angular/core';
import { Auth, authState, User as FirebaseUser } from '@angular/fire/auth';
import { Observable, BehaviorSubject, firstValueFrom } from 'rxjs';
import { map, filter, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {
  private auth = inject(Auth);
  private authReadySubject = new BehaviorSubject<boolean>(false);
  
  constructor() {
    // Listen to auth state changes and update the ready state
    authState(this.auth).pipe(take(1)).subscribe(() => {
      this.authReadySubject.next(true);
    });
  }

  /**
   * Observable that emits true when Firebase authentication is ready
   * (either user is logged in or we've confirmed no user is logged in)
   */
  get authReady$(): Observable<boolean> {
    return this.authReadySubject.asObservable();
  }

  /**
   * Observable of the current Firebase user
   */
  get currentFirebaseUser$(): Observable<FirebaseUser | null> {
    return authState(this.auth);
  }

  /**
   * Get the current Firebase user (sync)
   */
  get currentFirebaseUser(): FirebaseUser | null {
    return this.auth.currentUser;
  }

  /**
   * Wait for authentication to be ready and return the current user
   */
  async waitForAuthReady(): Promise<FirebaseUser | null> {
    // Wait for auth to be ready
    await firstValueFrom(this.authReady$.pipe(filter(ready => ready)));
    return this.currentFirebaseUser;
  }

  /**
   * Wait for authentication to be ready and get the user token if available
   */
  async waitForAuthToken(): Promise<string | null> {
    const user = await this.waitForAuthReady();
    if (user) {
      try {
        return await user.getIdToken();
      } catch (error) {
        console.error('Error getting Firebase token:', error);
        return null;
      }
    }
    return null;
  }

  /**
   * Observable that emits when user is authenticated and token is available
   */
  get authenticatedUser$(): Observable<FirebaseUser> {
    return this.currentFirebaseUser$.pipe(
      filter((user): user is FirebaseUser => user !== null)
    );
  }

  /**
   * Check if user is currently authenticated
   */
  get isAuthenticated(): boolean {
    return this.currentFirebaseUser !== null;
  }

  /**
   * Observable that emits the current authentication status
   */
  get isAuthenticated$(): Observable<boolean> {
    return this.currentFirebaseUser$.pipe(
      map(user => user !== null)
    );
  }
}
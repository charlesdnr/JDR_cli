import { Routes } from '@angular/router';
import { AuthComponent } from './pages/auth/auth.component';
import { HomeComponent } from './pages/home/home.component';
import { authGuard } from './guard/auth.guard';
import { moduleAccessGuard } from './guard/module-access.guard';
import { AccountComponent } from './pages/account/account.component';
import { ProjectComponent } from './pages/project/project.component';
import { NewProjectComponent } from './pages/new-project/new-project.component';
import { UserProfileComponent } from './pages/user-profile/user-profile.component';
import { PasswordResetComponent } from './components/password-reset/password-reset.component';
import { ExploreComponent } from './components/explore/explore.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  { path: 'auth/:config', component: AuthComponent },
  { path: 'home', component: HomeComponent },
  { path: 'explore', component: ExploreComponent },
  { path: 'account', component: AccountComponent, canActivate: [authGuard] },
  { path: 'projects', component: ProjectComponent, canActivate: [authGuard] },
  { path: 'new-module', component: NewProjectComponent, canActivate: [authGuard] },
  { path: 'module/:moduleId', component: NewProjectComponent, canActivate: [moduleAccessGuard] },
  { path: 'user/:userId', component: UserProfileComponent, canActivate: [authGuard] },
  { path: 'password-reset', component: PasswordResetComponent },
  { path: 'module', redirectTo: 'projects', pathMatch: 'full' },
];

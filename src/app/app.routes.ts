import { Routes } from '@angular/router';
import { AuthComponent } from './pages/auth/auth.component';
import { HomeComponent } from './pages/home/home.component';
import { authGuard } from './guard/auth.guard';
import { AccountComponent } from './pages/account/account.component';
import { ProjectComponent } from './pages/project/project.component';
import { NewProjectComponent } from './pages/new-project/new-project.component';

export const routes: Routes = [
    { path: '', pathMatch: 'full', redirectTo: 'auth/login' },
    { path: 'auth/:config', component: AuthComponent },
    { path: 'home', component: HomeComponent },
    { path: 'account', component: AccountComponent, canActivate: [authGuard] },
    { path: 'projects', component: ProjectComponent, canActivate: [authGuard] },
    { path: 'new-project', component: NewProjectComponent, canActivate: [authGuard] },
];

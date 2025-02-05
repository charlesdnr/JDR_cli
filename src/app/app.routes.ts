import { Routes } from '@angular/router';
import { AuthComponent } from './pages/auth/auth.component';
import { HomeComponent } from './pages/home/home.component';
import { authGuard } from './guard/auth.guard';

export const routes: Routes = [
    { path: '', pathMatch: 'full', redirectTo: 'auth/login' },
    { path: 'auth/:config', component: AuthComponent },
    { path: 'home', component: HomeComponent, canActivate: [authGuard] },
];

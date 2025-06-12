import { Component, inject, OnInit, Renderer2 } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { TranslateModule } from '@ngx-translate/core';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { filter } from 'rxjs';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ThemeService } from './services/theme.service';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TranslateModule, ToastModule, HeaderComponent, FooterComponent, ConfirmDialogModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  private _ = inject(ThemeService);
  private router = inject(Router);
  private renderer = inject(Renderer2);
  private document = inject(DOCUMENT);

  onAuth = false;
  url = '';

  ngOnInit(): void {
    this.checkAuthRoute();
    
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.url = event.url;
        this.onAuth = this.url.startsWith('/auth/') || this.url.startsWith('/password-reset');
        this.updateBodyClass();
      });
  }

  private checkAuthRoute(): void {
    this.url = this.router.url;
    this.onAuth = this.url.startsWith('/auth/') || this.url.startsWith('/password-reset');
    this.updateBodyClass();
  }

  private updateBodyClass(): void {
    if (this.onAuth) {
      this.renderer.addClass(this.document.body, 'auth-mode');
    } else {
      this.renderer.removeClass(this.document.body, 'auth-mode');
    }
  }
}

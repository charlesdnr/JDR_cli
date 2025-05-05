import { AfterViewInit, Component, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { TranslateModule } from '@ngx-translate/core';
import { HeaderComponent } from './components/header/header.component';
import { filter } from 'rxjs';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TranslateModule, ToastModule, HeaderComponent, ConfirmDialogModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements AfterViewInit {
  private _ = inject(ThemeService);
  private router = inject(Router);

  onAuth = false;
  url = '';

  ngAfterViewInit(): void {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.url = event.url;
        this.onAuth = this.url.startsWith('/auth/') || this.url.startsWith('/password-reset');
      });
  }
}

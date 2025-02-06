import { Component, computed, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { HeaderComponent } from './components/header/header.component';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TranslateModule, ToastModule, HeaderComponent],
  providers: [MessageService],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  onAuth = computed(() => {
    return this.url().startsWith('/auth/');
  });
  url = signal('')

  constructor(private translate: TranslateService, private router: Router) {
    translate.addLangs(['fr-FR', 'en-EN']);
    translate.setDefaultLang('fr-FR');
    translate.use('fr-FR')

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.url.set(event.url)
    });
  }
}

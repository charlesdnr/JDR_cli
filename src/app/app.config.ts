import {
  ApplicationConfig,
  importProvidersFrom,
  inject,
  provideAppInitializer,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withRouterConfig } from '@angular/router';

import { routes } from './app.routes';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import {
  TranslateLoader,
  TranslateModule,
  TranslateService,
} from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { authInterceptor } from './interceptors/auth.interceptor';
import Aura from '@primeng/themes/aura';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { firebaseConfig } from '../environments/environment.secret';
import { provideLottieOptions } from 'ngx-lottie';
import { DialogService } from 'primeng/dynamicdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';
import { dateFormatInterceptor } from './interceptors/DateFormat.interceptor';
import { ScrollService } from './services/scroll.service';

const httpLoaderFactory: (http: HttpClient) => TranslateHttpLoader = (
  http: HttpClient
) => new TranslateHttpLoader(http, '/assets/i18n/', '.json');

// Fonction d'initialisation pour TranslateService
export function initializeTranslateFactory(translate: TranslateService) {
  return () => {
    translate.addLangs(['en-US', 'fr-FR']);
    translate.setDefaultLang('fr-FR');
    return firstValueFrom(translate.use('fr-FR'));
  };
}

// Fonction d'initialisation pour ScrollService
export function initializeScrollFactory(scrollService: ScrollService) {
  return () => {
    // Le service est automatiquement initialisé via son constructeur
    // On utilise le paramètre pour éviter l'erreur de linting
    console.debug('ScrollService initialized:', !!scrollService);
    return Promise.resolve();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withRouterConfig({
        onSameUrlNavigation: 'reload'
      })
    ),
    provideHttpClient(withInterceptors([authInterceptor, dateFormatInterceptor])),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          cssLayer: 'styles.scss,assets/sass/*,primeng',
        },
      },
    }),
    importProvidersFrom([
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: httpLoaderFactory,
          deps: [HttpClient],
        },
      }),
    ]),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideAuth(() => getAuth()),
    provideLottieOptions({
      player: () => import('lottie-web'),
    }),
    provideAppInitializer(() =>
      initializeTranslateFactory(inject(TranslateService))()
    ),
    provideAppInitializer(() =>
      initializeScrollFactory(inject(ScrollService))()
    ),
    DialogService,
    MessageService,
    ConfirmationService,
  ],
};

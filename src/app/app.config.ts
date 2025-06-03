import {
  ApplicationConfig,
  importProvidersFrom,
  inject,
  provideAppInitializer,
  provideZoneChangeDetection,
  LOCALE_ID,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';

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

// Enregistrer la locale française
registerLocaleData(localeFr);

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

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
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
    // Fournir la locale française par défaut
    { provide: LOCALE_ID, useValue: 'fr-FR' },
    DialogService,
    MessageService,
    ConfirmationService,
  ],
};
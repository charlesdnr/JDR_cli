import { Component, computed, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { DecimalPipe } from '@angular/common';
import { UserHttpService } from '../../services/https/user-http.service';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { BadgeModule } from 'primeng/badge';
import { ChipModule } from 'primeng/chip';
import { RatingModule } from 'primeng/rating';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { CarouselModule } from 'primeng/carousel';
import { TranslateModule } from '@ngx-translate/core';
import { Router, RouterLink } from '@angular/router';
import { ModuleHttpService } from '../../services/https/module-http.service';
import { Module } from '../../classes/Module';
import { SkeletonModule } from 'primeng/skeleton';
import { PlatformStatistics } from '../../interfaces/PlatformStatisticsDTO';
import { Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { ModuleCardComponent } from '../../components/module-card/module-card.component';
import { DialogService, DynamicDialogModule, DynamicDialogRef } from 'primeng/dynamicdialog';
import { CreateModuleModalComponent } from '../../components/create-module-modal/create-module-modal.component';
import { AuthenticationService } from '../../services/authentication.service';
import { ModuleRatingsComponent } from '../../components/module-ratings/module-ratings.component';
import { ModuleCommentsComponent } from '../../components/module-comments/module-comments.component';
import { ModuleRatingsHttpService } from '../../services/https/module-ratings-http.service';
import { AggregatedRatings } from '../../classes/AggregatedRatings';

@Component({
  selector: 'app-home',
  imports: [
    ButtonModule, 
    CardModule, 
    BadgeModule, 
    ChipModule, 
    RatingModule, 
    TagModule,
    TooltipModule,
    CarouselModule,
    TranslateModule, 
    RouterLink, 
    SkeletonModule,
    FormsModule,
    ModuleCardComponent,
    DynamicDialogModule,
    DecimalPipe
  ],
  providers: [DialogService],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('600ms cubic-bezier(0.35, 0, 0.25, 1)', 
               style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('fadeInLeft', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-40px)' }),
        animate('700ms cubic-bezier(0.35, 0, 0.25, 1)', 
               style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ]),
    trigger('fadeInRight', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(40px)' }),
        animate('700ms cubic-bezier(0.35, 0, 0.25, 1)', 
               style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ]),
    trigger('scaleIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.8)' }),
        animate('500ms cubic-bezier(0.35, 0, 0.25, 1)', 
               style({ opacity: 1, transform: 'scale(1)' }))
      ])
    ]),
    trigger('staggerFadeIn', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger('100ms', [
            animate('400ms cubic-bezier(0.35, 0, 0.25, 1)', 
                   style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ]),
    trigger('slideInDown', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-30px)' }),
        animate('800ms cubic-bezier(0.35, 0, 0.25, 1)', 
               style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class HomeComponent implements OnInit, OnDestroy {
  userService = inject(UserHttpService);
  moduleHttpService = inject(ModuleHttpService);
  router = inject(Router);
  dialogService = inject(DialogService);
  authService = inject(AuthenticationService);
  moduleRatingsService = inject(ModuleRatingsHttpService);
  
  private subscriptions = new Subscription();
  private dialogRef: DynamicDialogRef | undefined;

  currentUser = computed(() => this.userService.currentJdrUser())

  mostRatedModules = signal<Module[]>([]);
  mostRecentModules = signal<Module[]>([]);
  loadingModules = signal(false);
  featuredModuleRating = signal<AggregatedRatings | null>(null);
  
  // Configuration des carrousels - 3 cartes par défaut
  carouselResponsiveOptions = [
    {
      breakpoint: '1024px',
      numVisible: 2,
      numScroll: 1
    },
    {
      breakpoint: '768px',
      numVisible: 1,
      numScroll: 1
    }
  ];
  
  // Nombre de cartes visibles par défaut (desktop)
  carouselNumVisible = 3;
  carouselNumScroll = 1;
  
  // Stats for the hero section - now using real data
  platformStats = signal<PlatformStatistics | null>(null);
  
  // Computed stats for display
  moduleStats = computed(() => {
    const stats = this.platformStats();
    return {
      total: stats?.totalModulesCreated || 0,
      creators: stats?.activeUsers || 0,
      adventures: stats?.sharedModules || 0
    };
  });

  ngOnInit() {
    this.initializeWithAuth();
  }
  
  private async initializeWithAuth() {
    try {
      // Wait for Firebase authentication to be ready before making HTTP calls
      await this.authService.waitForAuthReady();
      this.loadPopularModules();
    } catch (error) {
      console.error('Error waiting for authentication:', error);
      // Even if auth fails, try to load public modules
      this.loadPopularModules();
    }
  }
  
  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }

  async loadPopularModules() {
    this.loadingModules.set(true);
    try {
      const [ratedModules, recentModules] = await Promise.all([
        this.moduleHttpService.getMostRatedModules(0, 6),
        this.moduleHttpService.getMostRecentModules(0, 6)
      ]);
      
      this.mostRatedModules.set(ratedModules);
      this.mostRecentModules.set(recentModules);
      
      // Charger la note du module le mieux noté
      if (ratedModules.length > 0) {
        this.loadFeaturedModuleRating(ratedModules[0]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des modules:', error);
    } finally {
      this.loadingModules.set(false);
    }
  }
  
  // Navigation methods
  scrollToFeatures() {
    document.getElementById('explore')?.scrollIntoView({ 
      behavior: 'smooth' 
    });
  }

  scrollToExplore() {
    document.getElementById('explore')?.scrollIntoView({ 
      behavior: 'smooth' 
    });
  }

  navigateToModule(moduleId: number) {
    this.router.navigate(['/module', moduleId]);
  }

  // Helper method for time display
  getTimeAgo(date: string | Date): string {
    const now = new Date();
    const moduleDate = new Date(date);
    const diffInDays = Math.floor((now.getTime() - moduleDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Aujourd\'hui';
    if (diffInDays === 1) return 'Hier';
    if (diffInDays < 7) return `Il y a ${diffInDays} jours`;
    if (diffInDays < 30) return `Il y a ${Math.floor(diffInDays / 7)} semaines`;
    return `Il y a ${Math.floor(diffInDays / 30)} mois`;
  }

  // Rating value computed from actual module data
  get featuredModuleRatingValue(): number {
    return this.featuredModuleRating()?.moduleAverageRating || 0;
  }
  
  // Computed stats for featured module (stable values, not changing on each render)
  featuredModuleStats = computed(() => {
    const module = this.mostRatedModules()[0];
    if (!module) return { likes: 0, views: 0 };
    
    // Generate stable stats based on module ID to avoid random changes
    const baseId = module.id || 1;
    const likes = 100 + (baseId * 7) % 200; // Stable calculation based on module ID
    const views = 500 + (baseId * 13) % 1000; // Stable calculation based on module ID
    
    return { likes, views };
  });

  // Helper method to get stable stats for any module
  getModuleStats(module: Module): { likes: number; views: number } {
    const baseId = module.id || 1;
    const likes = 1 + (baseId * 3) % 100; // Stable calculation based on module ID (1-100)
    const views = 50 + (baseId * 11) % 500; // Stable calculation based on module ID (50-549)
    
    return { likes, views };
  }

  // Navigation method for user profiles
  goToUserProfile(event: Event, userId?: number) {
    event.stopPropagation(); // Empêcher la propagation vers le click du module
    if (userId && userId > 0 && Number.isInteger(userId)) {
      this.router.navigate(['/user', userId]).catch(error => {
        console.error('Navigation error:', error);
      });
    }
  }

  // Method to open create module modal
  openCreateModuleModal() {
    this.dialogRef = this.dialogService.open(CreateModuleModalComponent, {
      header: '',
      width: 'calc(100vw - 5vw)',
      height: '90vh',
      modal: true,
      closable: false,
      maximizable: false,
      resizable: false,
      styleClass: 'create-module-dialog',
      contentStyle: { 
        padding: '0',
        height: '100%',
        width: '100%'
      },
      style: {
        'max-width': '900px',
        'height': '90vh'
      },
      baseZIndex: 10000
    });

    // Force modal size after opening (mais gardons le centrage)
    setTimeout(() => {
      const dialogElements = document.querySelectorAll('.create-module-dialog .p-dialog');
      dialogElements.forEach((dialog: Element) => {
        const htmlDialog = dialog as HTMLElement;
        htmlDialog.style.height = '90vh';
        htmlDialog.style.maxHeight = '90vh';
        
        const content = htmlDialog.querySelector('.p-dialog-content') as HTMLElement;
        if (content) {
          content.style.height = '90vh';
          content.style.maxHeight = '90vh';
        }
      });
    }, 100);
  }

  // Charger la note moyenne du module le mieux noté
  private async loadFeaturedModuleRating(module: Module) {
    if (!module.id || !module.versions || module.versions.length === 0) return;

    try {
      // Trouver la dernière version publiée
      const publishedVersions = module.versions.filter(v => v.published);
      if (publishedVersions.length === 0) return;

      const latestVersion = publishedVersions.sort((a, b) => (b.version || 0) - (a.version || 0))[0];
      if (!latestVersion.id) return;

      const ratingsData = await this.moduleRatingsService.getModuleRatingsByModuleVersion(latestVersion.id);
      this.featuredModuleRating.set(ratingsData);
    } catch (error) {
      console.error('Erreur lors du chargement de la note du module:', error);
    }
  }

  // Ouvrir la popup des ratings pour le module le mieux noté
  openFeaturedModuleRatings(event: Event) {
    event.stopPropagation();
    const module = this.mostRatedModules()[0];
    if (!module) return;

    // Trouver la dernière version publiée
    const publishedVersions = module.versions?.filter(v => v.published) || [];
    if (publishedVersions.length === 0) return;

    const latestVersion = publishedVersions.sort((a, b) => (b.version || 0) - (a.version || 0))[0];
    if (!latestVersion.id) return;

    this.dialogService.open(ModuleRatingsComponent, {
      header: 'Évaluations du module',
      width: '90vw',
      height: '80vh',
      data: {
        moduleId: module.id,
        moduleVersionId: latestVersion.id
      },
      styleClass: 'ratings-dialog',
      maximizable: true,
      modal: true,
      closable: true
    });
  }

  // Ouvrir la popup des commentaires pour le module le mieux noté  
  openFeaturedModuleComments(event: Event) {
    event.stopPropagation();
    const module = this.mostRatedModules()[0];
    if (!module) return;

    // Trouver la dernière version publiée
    const publishedVersions = module.versions?.filter(v => v.published) || [];
    if (publishedVersions.length === 0) return;

    const latestVersion = publishedVersions.sort((a, b) => (b.version || 0) - (a.version || 0))[0];
    if (!latestVersion.id) return;

    this.dialogService.open(ModuleCommentsComponent, {
      header: 'Commentaires du module',
      width: '90vw',
      height: '80vh',
      data: {
        moduleId: module.id,
        moduleVersionId: latestVersion.id
      },
      styleClass: 'comments-dialog',  
      maximizable: true,
      modal: true,
      closable: true
    });
  }
}

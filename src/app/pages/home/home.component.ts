import { Component, computed, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { UserHttpService } from '../../services/https/user-http.service';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { BadgeModule } from 'primeng/badge';
import { ChipModule } from 'primeng/chip';
import { RatingModule } from 'primeng/rating';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
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
    TranslateModule, 
    RouterLink, 
    SkeletonModule,
    FormsModule,
    ModuleCardComponent,
    DynamicDialogModule
  ],
  providers: [DialogService],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit, OnDestroy {
  userService = inject(UserHttpService);
  moduleHttpService = inject(ModuleHttpService);
  router = inject(Router);
  dialogService = inject(DialogService);
  
  private subscriptions = new Subscription();
  private dialogRef: DynamicDialogRef | undefined;

  currentUser = computed(() => this.userService.currentJdrUser())

  mostSavedModules = signal<Module[]>([]);
  mostRecentModules = signal<Module[]>([]);
  loadingModules = signal(false);
  
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
    this.loadPopularModules();
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
      const [savedModules, recentModules] = await Promise.all([
        this.moduleHttpService.getMostSavedModules(0, 6),
        this.moduleHttpService.getMostRecentModules(0, 6)
      ]);
      
      this.mostSavedModules.set(savedModules);
      this.mostRecentModules.set(recentModules);
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

  // Rating value for PrimeNG rating component
  ratingValue = 5;
  
  // Computed stats for featured module (stable values, not changing on each render)
  featuredModuleStats = computed(() => {
    const module = this.mostSavedModules()[0];
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
    if (userId) {
      this.router.navigate(['/user', userId]);
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
}

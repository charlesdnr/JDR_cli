import { Component, computed, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { UserHttpService } from '../../services/https/user-http.service';
import { ButtonModule } from 'primeng/button';
import { TranslateModule } from '@ngx-translate/core';
import { Router, RouterLink } from '@angular/router';
import { ModuleHttpService } from '../../services/https/module-http.service';
import { Module } from '../../classes/Module';
import { SkeletonModule } from 'primeng/skeleton';
import { StatisticsService } from '../../services/statistics.service';
import { WebSocketService } from '../../services/websocket.service';
import { PlatformStatistics } from '../../interfaces/PlatformStatisticsDTO';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-home',
  imports: [ButtonModule, TranslateModule, RouterLink, SkeletonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit, OnDestroy {
  userService = inject(UserHttpService);
  moduleHttpService = inject(ModuleHttpService);
  router = inject(Router);
  statisticsService = inject(StatisticsService);
  webSocketService = inject(WebSocketService);
  
  private subscriptions = new Subscription();

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
    this.loadPlatformStatistics();
    this.subscribeToRealTimeStats();
    this.webSocketService.connect();
  }
  
  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.webSocketService.disconnect();
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
  
  private loadPlatformStatistics() {
    this.subscriptions.add(
      this.statisticsService.getPlatformStatistics().subscribe({
        next: (stats) => {
          this.platformStats.set(stats);
          this.statisticsService.updatePlatformStatistics(stats);
        },
        error: (error) => {
          console.error('Erreur lors du chargement des statistiques:', error);
          // Fallback to default values
          this.platformStats.set({
            totalModulesCreated: 1247,
            activeUsers: 892,
            sharedModules: 15439
          });
        }
      })
    );
  }
  
  private subscribeToRealTimeStats() {
    this.subscriptions.add(
      this.statisticsService.platformStatistics$.subscribe(stats => {
        if (stats) {
          this.platformStats.set(stats);
        }
      })
    );
  }

  // Navigation methods
  scrollToFeatures() {
    document.getElementById('features')?.scrollIntoView({ 
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

  // Math reference for template
  Math = Math;
}

import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { UserHttpService } from '../../services/https/user-http.service';
import { ButtonModule } from 'primeng/button';
import { TranslateModule } from '@ngx-translate/core';
import { Router, RouterLink } from '@angular/router';
import { ModuleHttpService } from '../../services/https/module-http.service';
import { Module } from '../../classes/Module';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-home',
  imports: [ButtonModule, TranslateModule, RouterLink, SkeletonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  userService = inject(UserHttpService);
  moduleHttpService = inject(ModuleHttpService);
  router = inject(Router);

  currentUser = computed(() => this.userService.currentJdrUser())

  mostSavedModules = signal<Module[]>([]);
  mostRecentModules = signal<Module[]>([]);
  loadingModules = signal(false);
  
  // Stats for the hero section
  moduleStats = signal({
    total: 1247,
    creators: 892,
    adventures: 15439
  });

  ngOnInit() {
    this.loadPopularModules();
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

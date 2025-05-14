import { Component, computed, inject, signal } from '@angular/core';
import { UserHttpService } from '../../services/https/user-http.service';
import { ButtonModule } from 'primeng/button';
import { TranslateModule } from '@ngx-translate/core';
import { RouterLink } from '@angular/router';
import { ModuleHttpService } from '../../services/https/module-http.service';
import { Module } from '../../classes/Module';
import { SkeletonModule } from 'primeng/skeleton';
import { ModuleViewerComponent } from '../../components/module-viewer/module-viewer.component';

@Component({
  selector: 'app-home',
  imports: [ButtonModule, TranslateModule, RouterLink, SkeletonModule, ModuleViewerComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  userService = inject(UserHttpService);
  moduleHttpService = inject(ModuleHttpService);

  currentUser = computed(() => this.userService.currentJdrUser())

  mostSavedModules = signal<Module[]>([]);
  mostRecentModules = signal<Module[]>([]);
  loadingModules = signal(false);

  ngOnInit() {
    this.loadPopularModules();
  }

  async loadPopularModules() {
    this.loadingModules.set(true);
    try {
      const [savedModules, recentModules] = await Promise.all([
        this.moduleHttpService.getMostSavedModules(0, 5),
        this.moduleHttpService.getMostRecentModules(0, 5)
      ]);
      
      this.mostSavedModules.set(savedModules);
      this.mostRecentModules.set(recentModules);
    } catch (error) {
      console.error('Erreur lors du chargement des modules:', error);
    } finally {
      this.loadingModules.set(false);
    }
  }
}

import { Injectable, signal, linkedSignal, inject } from '@angular/core';
import { Module } from '../classes/Module';
import { ModuleVersion } from '../classes/ModuleVersion';
import { ModuleAccess } from '../classes/ModuleAccess';
import { ModuleHttpService } from './https/module-http.service';

@Injectable({
  providedIn: 'root'
})
export class ModuleService {
  private moduleHttpService = inject(ModuleHttpService)

  currentModule = signal<Module | null>(null);
  currentModuleVersion = linkedSignal<ModuleVersion | undefined>(
    () => this.currentModule()?.versions[0]
  );
  private loadingModule = signal<boolean>(false);

  constructor() {
    // Charger le module au démarrage du service
    this.loadStoredModule();
  }

  // Charger le module depuis l'API en utilisant l'ID stocké
  private async loadStoredModule(): Promise<void> {
    const storedModuleId = localStorage.getItem('currentModuleId');
    if (storedModuleId) {
      try {
        this.loadingModule.set(true);
        const moduleId = parseInt(storedModuleId, 10);
        if (!isNaN(moduleId)) {
          const module = await this.moduleHttpService.getModuleById(moduleId);
          this.currentModule.set(module);
        }
      } catch (e) {
        console.error('Erreur lors du chargement du module:', e);
        localStorage.removeItem('currentModuleId');
      } finally {
        this.loadingModule.set(false);
      }
    }
  }

  // Méthode pour vérifier si le module est en cours de chargement
  isLoading(): boolean {
    return this.loadingModule();
  }

  // Mettre à jour le module et stocker uniquement l'ID
  async updateCurrentModule(module: Module | null): Promise<void> {
    this.currentModule.set(module);
    if (module) {
      localStorage.setItem('currentModuleId', module.id.toString());
    } else {
      localStorage.removeItem('currentModuleId');
    }
  }

  // Méthode pour charger un module par son ID
  async loadModuleById(id: number): Promise<void> {
    try {
      this.loadingModule.set(true);
      const module = await this.moduleHttpService.getModuleById(id);
      this.currentModule.set(module);
      localStorage.setItem('currentModuleId', id.toString());
    } catch (e) {
      console.error('Erreur lors du chargement du module:', e);
    } finally {
      this.loadingModule.set(false);
    }
  }

  // Méthode pour effacer le module
  clearCurrentModule(): void {
    this.currentModule.set(null);
    localStorage.removeItem('currentModuleId');
  }

  // Méthode spécifique pour mettre à jour les accès
  async updateModuleAccesses(accesses: ModuleAccess[]): Promise<void> {
    const module = this.currentModule();
    if (module) {
      module.accesses = accesses;

      // On peut éventuellement synchroniser avec le backend ici si nécessaire
      // Si une API existe pour mettre à jour uniquement les accès
      // await this.moduleHttpService.updateModuleAccesses(module.id, accesses);

      this.currentModule.set({...module}); // Forcer la mise à jour du signal
    }
  }

  // Recharger le module courant depuis l'API
  async refreshCurrentModule(): Promise<void> {
    const module = this.currentModule();
    if (module) {
      await this.loadModuleById(module.id);
    }
  }
}

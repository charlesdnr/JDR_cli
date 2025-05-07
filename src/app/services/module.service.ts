// src/app/services/module.service.ts
import { Injectable, signal, linkedSignal, inject, WritableSignal } from '@angular/core';
import { Module } from '../classes/Module';
import { ModuleVersion } from '../classes/ModuleVersion';
import { ModuleAccess } from '../classes/ModuleAccess';
import { ModuleHttpService } from './https/module-http.service';
import { EModuleType } from '../enum/ModuleType'; // Assure-toi que EModuleType est importé
import { UserHttpService } from './https/user-http.service'; // Import UserHttpService

@Injectable({
  providedIn: 'root'
})
export class ModuleService {
  private moduleHttpService = inject(ModuleHttpService);
  private userHttpService = inject(UserHttpService);

  currentModule: WritableSignal<Module | null> = signal(null);

  currentModuleVersion = linkedSignal<ModuleVersion | undefined>(
    () => this.currentModule()?.versions[0]
  );
  loadingModule = signal<boolean>(false);


  // Charger un module par son ID (utilisé par le composant lors de la navigation vers /module/:id)
  async loadModuleById(id: number): Promise<void> {
    // Si le module demandé est déjà chargé, ne rien faire
    if (this.currentModule()?.id === id) {
        console.log(`Module ${id} déjà chargé.`);
        return;
    }

    this.loadingModule.set(true);
    this.currentModule.set(null); // Vide le module actuel avant de charger le nouveau
    try {
      const module = await this.moduleHttpService.getModuleById(id);
      // Initialise la version si elle n'existe pas (cas rare mais possible)
      if (!module.versions || module.versions.length === 0) {
        module.versions = [new ModuleVersion()];
      }
      this.currentModule.set(module);
      console.log(`Module ${id} chargé.`);
    } catch (e) {
      console.error(`Erreur lors du chargement du module ${id}:`, e);
      this.currentModule.set(null); // Assure que le module est null en cas d'erreur
      // Peut-être rediriger ou afficher un message d'erreur
    } finally {
      this.loadingModule.set(false);
    }
  }

  // Préparer pour un nouveau module (utilisé par le composant lors de la navigation vers /new-module)
  prepareNewModule(): void {
    this.loadingModule.set(true); // Peut être rapide, mais pour la cohérence
    const user = this.userHttpService.currentJdrUser(); // Récupère l'utilisateur courant

    if (!user) {
      console.error("Impossible de créer un nouveau module : utilisateur non connecté.");
      this.loadingModule.set(false);
      return;
    }

    const newModule = new Module();
    newModule.id = 0;
    newModule.title = 'Nouveau Module';
    newModule.description = '';
    newModule.creator = user;
    newModule.isTemplate = false;
    newModule.type = EModuleType.Scenario;
    newModule.versions = [new ModuleVersion()];
    newModule.versions[0].creator = user;
    newModule.accesses = [];
    newModule.tags = [];
    newModule.moduleBlocks = [];

    this.currentModule.set(newModule);
    console.log("Préparation d'un nouveau module.");
    this.loadingModule.set(false);
  }

  // Mettre à jour le signal
  setCurrentModule(module: Module | null): void {
    this.currentModule.set(module);
  }

  // Méthode pour effacer le module (utile en quittant l'éditeur par ex.)
  clearCurrentModule(): void {
    this.currentModule.set(null);
    console.log("Module courant effacé.");
  }

  // Méthode spécifique pour mettre à jour les accès
  async updateModuleAccesses(accesses: ModuleAccess[]): Promise<void> {
    const module = this.currentModule();
    if (module) {
      module.accesses = accesses;
      this.currentModule.set({...module});
    }
  }

  // Recharger le module courant depuis l'API
  async refreshCurrentModule(): Promise<void> {
    const module = this.currentModule();
    if (module && module.id !== 0) { // Ne recharge que si ce n'est pas un nouveau module non sauvegardé
      await this.loadModuleById(module.id);
    } else {
        console.log("Impossible de rafraîchir un nouveau module non sauvegardé.");
    }
  }
}

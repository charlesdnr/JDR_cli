import {
  Injectable,
  signal,
  inject,
  WritableSignal,
  computed,
} from '@angular/core';
import { Module } from '../classes/Module';
import { ModuleVersion } from '../classes/ModuleVersion';
import { ModuleAccess } from '../classes/ModuleAccess';
import { ModuleHttpService } from './https/module-http.service';
import { EModuleType } from '../enum/ModuleType'; // Assure-toi que EModuleType est importé
import { UserHttpService } from './https/user-http.service'; // Import UserHttpService

@Injectable({
  providedIn: 'root',
})
export class ModuleService {
  private moduleHttpService = inject(ModuleHttpService);
  private userHttpService = inject(UserHttpService);

  currentModule: WritableSignal<Module | null> = signal(null);

  currentModuleVersion = signal<ModuleVersion | undefined>(
    this.currentModule()?.versions[0]
  );
  loadingModule = signal<boolean>(false);

  userAccessRights = computed(() => {
    const module = this.currentModule();
    const currentUser = this.userHttpService.currentJdrUser();
    const currentVersion = this.currentModuleVersion();

    // Valeurs par défaut (aucun droit)
    const defaultRights = {
      canView: false,
      canEdit: false,
      canPublish: false,
      canInvite: false,
      isCreator: false,
    };

    if (!module) {
      return defaultRights;
    }

    // Si pas d'utilisateur connecté, vérifier si le module est publié
    if (!currentUser) {
      const isPublished = currentVersion && currentVersion.published;
      if (isPublished) {
        return {
          canView: true,
          canEdit: false,
          canPublish: false,
          canInvite: false,
          isCreator: false,
        };
      }
      return defaultRights;
    }

    // Si l'utilisateur est le créateur, il a tous les droits
    if (module.creator && module.creator.id === currentUser.id) {
      return {
        canView: true,
        canEdit: true,
        canPublish: true,
        canInvite: true,
        isCreator: true,
      };
    }

    // Vérifier si le module est publié
    const isPublished = currentVersion && currentVersion.published;
    console.log(isPublished)

    // Vérifier les droits d'accès spécifiques
    const userAccess = module.accesses.find(
      (access) => access.user && access.user.id === currentUser.id
    );

    // Si le module est publié, tout le monde peut le voir
    if (isPublished) {
      return {
        canView: true,
        canEdit: userAccess ? userAccess.canEdit : false,
        canPublish: userAccess ? userAccess.canPublish : false,
        canInvite: userAccess ? userAccess.canInvite : false,
        isCreator: false,
      };
    }

    if (!userAccess) {
      return defaultRights;
    }

    return {
      canView: userAccess.canView,
      canEdit: userAccess.canEdit,
      canPublish: userAccess.canPublish,
      canInvite: userAccess.canInvite,
      isCreator: false,
    };
  });

  // Charger un module par son ID (utilisé par le composant lors de la navigation vers /module/:id)
  async loadModuleById(id: number): Promise<void> {
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
      console.error(
        'Impossible de créer un nouveau module : utilisateur non connecté.'
      );
      this.loadingModule.set(false);
      return;
    }

    const newVersion = new ModuleVersion();
    newVersion.creator = user;
    newVersion.moduleId = 0;
    newVersion.version = 1;
    newVersion.published = false;
    newVersion.blocks = [];

    const newModule = new Module();
    newModule.id = 0;
    newModule.title = 'Nouveau Module';
    newModule.description = 'Nouvelle Description';
    newModule.creator = user;
    newModule.isTemplate = false;
    newModule.type = EModuleType.Scenario;
    newModule.versions = [newVersion];
    newModule.accesses = [];
    newModule.tags = [];
    newModule.moduleBlocks = [];

    this.loadingModule.set(false);
    this.currentModule.set(newModule);
    this.currentModuleVersion.set(newVersion);
    console.log("Préparation d'un nouveau module.");
  }

  // Mettre à jour le signal
  setCurrentModule(module: Module | null): void {
    this.currentModule.set(module);
  }

  // Méthode pour effacer le module (utile en quittant l'éditeur par ex.)
  clearCurrentModule(): void {
    this.currentModule.set(null);
    console.log('Module courant effacé.');
  }

  // Méthode spécifique pour mettre à jour les accès
  async updateModuleAccesses(accesses: ModuleAccess[]): Promise<void> {
    const module = this.currentModule();
    if (module) {
      module.accesses = accesses;
      this.currentModule.set({ ...module });
    }
  }

  updateModuleAccess(access: ModuleAccess): void {
    const module = this.currentModule();
    if (module) {
      const updatedAccesses = module.accesses.map((acc) =>
        acc.id === access.id ? access : acc
      );

      // Update the module with the new accesses array
      this.updateModuleAccesses(updatedAccesses);
    }
  }

  // Recharger le module courant depuis l'API
  async refreshCurrentModule(): Promise<void> {
    const module = this.currentModule();
    if (module && module.id !== 0) {
      // Ne recharge que si ce n'est pas un nouveau module non sauvegardé
      await this.loadModuleById(module.id);
    } else {
      console.log('Impossible de rafraîchir un nouveau module non sauvegardé.');
    }
  }

  setCurrentVersion(version: ModuleVersion): void {
    this.currentModuleVersion.set(version);
  }
}

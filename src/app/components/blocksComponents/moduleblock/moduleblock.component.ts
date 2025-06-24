import {
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { CardModule } from 'primeng/card';
import { TranslateModule } from '@ngx-translate/core';
import { TooltipModule } from 'primeng/tooltip';
import { IntegratedModuleBlock } from '../../../classes/IntegratedModuleBlock';
import { Module } from '../../../classes/Module';
import { ModuleHttpService } from '../../../services/https/module-http.service';
import { UserHttpService } from '../../../services/https/user-http.service';
import { ModuleVersionHttpService } from '../../../services/https/module-version-http.service';

interface ModuleOption {
  label: string;
  value: number;
  description?: string;
  isPrivate?: boolean;
}

@Component({
  selector: 'app-module-block',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    SkeletonModule,
    CardModule,
    TranslateModule,
    TooltipModule,
  ],
  templateUrl: './moduleblock.component.html',
  styleUrl: './moduleblock.component.scss',
})
export class ModuleBlockComponent implements OnInit {
  moduleBlock = input.required<IntegratedModuleBlock>();
  isReadOnly = input<boolean>(false);

  private moduleHttpService = inject(ModuleHttpService);
  private userService = inject(UserHttpService);
  private moduleVersionHttpService = inject(ModuleVersionHttpService);

  // État du composant
  availableModules = signal<Module[]>([]);
  privateModules = signal<Module[]>([]);
  selectedModule = signal<Module | null>(null);
  loadingModules = signal(false);
  loadingSelectedModule = signal(false);
  currentModuleId = signal<number | null>(null);
  currentUserId = signal<number | null>(null);
  
  // Signal pour la valeur sélectionnée du select
  selectedModuleId = signal<number | undefined>(undefined);

  // Computed pour les options du select
  moduleOptions = computed<ModuleOption[]>(() => {
    const currentModule = this.currentModuleId();
    
    // Modules publics (excluant le module courant)
    const filteredPublicModules = this.availableModules().filter(
      (module) => module.id !== currentModule
    );
    
    // Modules privés de l'utilisateur (excluant le module courant)
    const filteredPrivateModules = this.privateModules().filter(
      (module) => module.id !== currentModule
    );
    
    const currentUserId = this.currentUserId();
    const publicOptions: ModuleOption[] = filteredPublicModules.map((module) => {
      const isOwnModule = module.creator?.id === currentUserId;
      return {
        label: isOwnModule ? `📖 ${module.title}` : module.title,
        value: module.id,
        description:
          (module.description.length > 100
            ? module.description.substring(0, 100) + '...'
            : module.description) + (isOwnModule ? ' (Vos modules)' : ''),
        isPrivate: false,
      };
    });
    
    const privateOptions: ModuleOption[] = filteredPrivateModules.map((module) => ({
      label: `🔒 ${module.title}`,
      value: module.id,
      description:
        (module.description.length > 100
          ? module.description.substring(0, 100) + '...'
          : module.description) + ' (Privé)',
      isPrivate: true,
    }));
    
    // Séparer les modules publics de l'utilisateur des autres
    const ownPublicOptions = publicOptions.filter(option => 
      option.label.startsWith('📖')
    );
    const otherPublicOptions = publicOptions.filter(option => 
      !option.label.startsWith('📖')
    );
    
    // Combiner les options: modules privés, puis modules publics de l'utilisateur, puis autres modules publics
    return [...privateOptions, ...ownPublicOptions, ...otherPublicOptions];
  });

  // Computed pour vérifier si un module est sélectionné
  hasSelectedModule = computed(
    () => !!this.selectedModuleId() && !!this.selectedModule()
  );

  async ngOnInit() {
    // Initialiser le signal avec la valeur actuelle du bloc
    this.selectedModuleId.set(this.moduleBlock().moduleId);
    
    // D'abord, obtenir l'ID du module courant et l'utilisateur courant
    await Promise.all([
      this.loadCurrentModuleId(),
      this.loadCurrentUser()
    ]);
    
    await this.loadAvailableModules();

    // Si le bloc a déjà un moduleId, charger ce module
    if (this.moduleBlock().moduleId) {
      await this.loadSelectedModuleDetails();
    } else {
      // S'assurer que le signal est bien à undefined si pas de module
      this.selectedModuleId.set(undefined);
    }
  }

  private async loadCurrentModuleId() {
    try {
      const moduleVersion = await this.moduleVersionHttpService.getModuleVersionById(
        this.moduleBlock().moduleVersionId
      );
      this.currentModuleId.set(moduleVersion.moduleId);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'ID du module courant:', error);
      this.currentModuleId.set(null);
    }
  }

  private async loadCurrentUser() {
    try {
      const currentUser = this.userService.currentJdrUser();
      if (currentUser) {
        this.currentUserId.set(currentUser.id);
      } else {
        this.currentUserId.set(null);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'utilisateur courant:', error);
      this.currentUserId.set(null);
    }
  }

  private async loadAvailableModules() {
    if (this.isReadOnly()) return;

    this.loadingModules.set(true);
    try {
      // Charger tous les modules publics accessibles à l'utilisateur
      const allModules = await this.moduleHttpService.getAllModules();

      // Filtrer pour ne montrer que les modules publiés
      const publicModules = allModules.filter((module) =>
        module.versions.some((version) => version.published)
      );

      // Séparer les modules privés de l'utilisateur des modules publics
      const currentUserId = this.currentUserId();
      if (currentUserId) {
        const userPrivateModules = allModules.filter((module) =>
          module.creator?.id === currentUserId && 
          !module.versions.some((version) => version.published)
        );
        this.privateModules.set(userPrivateModules);
        
        // Inclure tous les modules publics (y compris ceux de l'utilisateur)
        this.availableModules.set(publicModules);
      } else {
        this.availableModules.set(publicModules);
        this.privateModules.set([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des modules:', error);
    } finally {
      this.loadingModules.set(false);
    }
  }

  private async loadSelectedModuleDetails() {
    if (!this.moduleBlock().moduleId) return;

    this.loadingSelectedModule.set(true);
    try {
      const module = await this.moduleHttpService.getModuleById(
        this.moduleBlock().moduleId!
      );
      this.selectedModule.set(module);
      // S'assurer que le signal est synchronisé
      this.selectedModuleId.set(this.moduleBlock().moduleId);
    } catch (error) {
      console.error('Erreur lors du chargement du module sélectionné:', error);
      // En cas d'erreur, réinitialiser l'ID du module
      this.moduleBlock().moduleId = undefined;
      this.selectedModuleId.set(undefined);
    } finally {
      this.loadingSelectedModule.set(false);
    }
  }

  onModuleSelect(moduleId: number | null) {
    if (this.isReadOnly()) return;

    // Empêcher la sélection du module courant
    if (moduleId === this.currentModuleId()) {
      console.warn('Impossible de sélectionner le module courant');
      return;
    }

    // Mettre à jour les signaux
    this.selectedModuleId.set(moduleId || undefined);
    this.moduleBlock().moduleId = moduleId || undefined;

    if (moduleId) {
      // Trouver le module sélectionné dans les listes publiques et privées
      let selected = this.availableModules().find((m) => m.id === moduleId);
      if (!selected) {
        selected = this.privateModules().find((m) => m.id === moduleId);
      }
      
      if (selected) {
        this.selectedModule.set(selected);
        // Mettre à jour le titre du bloc avec le titre du module sélectionné
        const isPrivate = this.privateModules().some((m) => m.id === moduleId);
        const isOwnPublic = selected.creator?.id === this.currentUserId() && !isPrivate;
        
        let prefix = 'Module intégré';
        if (isPrivate) {
          prefix = '🔒 Module intégré';
        } else if (isOwnPublic) {
          prefix = '📖 Module intégré';
        }
        
        this.moduleBlock().title = `${prefix}: ${selected.title}`;
      }
    } else {
      this.selectedModule.set(null);
      this.moduleBlock().title = 'Module intégré';
    }
  }

  onTitleChange(value: string) {
    if (this.isReadOnly()) return;
    this.moduleBlock().title = value;
  }

  getModulePreview(): string {
    const module = this.selectedModule();
    if (!module) return '';

    return module.description.length > 150
      ? module.description.substring(0, 150) + '...'
      : module.description;
  }

  getModuleVersionsCount(): number {
    return this.selectedModule()?.versions.length || 0;
  }

  getPublishedVersionsCount(): number {
    const module = this.selectedModule();
    if (!module) return 0;

    return module.versions.filter((version) => version.published).length;
  }

  getModuleCreator(): string {
    return this.selectedModule()?.creator?.username || 'Inconnu';
  }

  openModuleInNewTab() {
    const moduleId = this.moduleBlock().moduleId;
    if (moduleId) {
      const url = `/module/${moduleId}`;
      window.open(url, '_blank');
    }
  }
}

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

interface ModuleOption {
  label: string;
  value: number;
  description?: string;
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

  // État du composant
  availableModules = signal<Module[]>([]);
  selectedModule = signal<Module | null>(null);
  loadingModules = signal(false);
  loadingSelectedModule = signal(false);

  // Computed pour les options du select
  moduleOptions = computed<ModuleOption[]>(() => {
    return this.availableModules().map((module) => ({
      label: module.title,
      value: module.id,
      description:
        module.description.length > 100
          ? module.description.substring(0, 100) + '...'
          : module.description,
    }));
  });

  // Computed pour vérifier si un module est sélectionné
  hasSelectedModule = computed(
    () => !!this.moduleBlock().moduleId && !!this.selectedModule()
  );

  async ngOnInit() {
    await this.loadAvailableModules();

    // Si le bloc a déjà un moduleId, charger ce module
    if (this.moduleBlock().moduleId) {
      await this.loadSelectedModuleDetails();
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

      this.availableModules.set(publicModules);
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
    } catch (error) {
      console.error('Erreur lors du chargement du module sélectionné:', error);
      // En cas d'erreur, réinitialiser l'ID du module
      this.moduleBlock().moduleId = undefined;
    } finally {
      this.loadingSelectedModule.set(false);
    }
  }

  onModuleSelect(moduleId: number | null) {
    if (this.isReadOnly()) return;

    this.moduleBlock().moduleId = moduleId || undefined;

    if (moduleId) {
      // Trouver le module sélectionné dans la liste
      const selected = this.availableModules().find((m) => m.id === moduleId);
      if (selected) {
        this.selectedModule.set(selected);
        // Mettre à jour le titre du bloc avec le titre du module sélectionné
        this.moduleBlock().title = `Module intégré: ${selected.title}`;
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

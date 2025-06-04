import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ChipModule } from 'primeng/chip';
import { SkeletonModule } from 'primeng/skeleton';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TranslateModule } from '@ngx-translate/core';
import { ModuleViewerComponent } from '../../components/module-viewer/module-viewer.component';
import { ModuleHttpService } from '../../services/https/module-http.service';
import { TagHttpService } from '../../services/https/tag-http.service';
import { GameSystemHttpService } from '../../services/https/game-system-http.service';
import { Module } from '../../classes/Module';
import { Tag } from '../../classes/Tag';
import { GameSystem } from '../../classes/GameSystem';
import { EModuleType } from '../../enum/ModuleType';

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    ChipModule,
    SkeletonModule,
    IconFieldModule,
    InputIconModule,
    TranslateModule,
    ModuleViewerComponent,
  ],
  templateUrl: './explore.component.html',
  styleUrl: './explore.component.scss',
})
export class ExploreComponent implements OnInit {
  private moduleHttpService = inject(ModuleHttpService);
  private tagHttpService = inject(TagHttpService);
  private gameSystemHttpService = inject(GameSystemHttpService);

  // Signals pour l'état
  modules = signal<Module[]>([]);
  filteredModules = signal<Module[]>([]);
  availableTags = signal<Tag[]>([]);
  gameSystems = signal<GameSystem[]>([]);
  loading = signal(false);

  // Filtres
  searchTerm = signal('');
  selectedTags = signal<Tag[]>([]);
  selectedGameSystem = signal<GameSystem | null>(null);
  selectedModuleType = signal<EModuleType | null>(null);
  sortBy = signal<'recent' | 'popular' | 'title'>('recent');

  // Options pour les filtres
  moduleTypes = [
    { label: 'Scénario', value: EModuleType.Scenario },
    { label: 'Lore', value: EModuleType.Lore },
    { label: 'Objet de jeu', value: EModuleType.GameItem },
    { label: 'Bundle', value: EModuleType.Bundle },
    { label: 'Autre', value: EModuleType.Other },
  ];

  sortOptions = [
    { label: 'Plus récents', value: 'recent' },
    { label: 'Plus populaires', value: 'popular' },
    { label: 'Titre (A-Z)', value: 'title' },
  ];

  // Computed pour les modules filtrés
  displayedModules = computed(() => {
    let modules = this.modules();

    // Filtrer par terme de recherche
    if (this.searchTerm()) {
      modules = modules.filter(
        (module) =>
          module.title
            .toLowerCase()
            .includes(this.searchTerm().toLowerCase()) ||
          module.description
            .toLowerCase()
            .includes(this.searchTerm().toLowerCase())
      );
    }

    // Filtrer par tags
    if (this.selectedTags().length > 0) {
      modules = modules.filter((module) =>
        this.selectedTags().some((selectedTag) =>
          module.tags.some((moduleTag) => moduleTag.id === selectedTag.id)
        )
      );
    }

    // Filtrer par système de jeu
    if (this.selectedGameSystem()) {
      modules = modules.filter((module) =>
        module.versions.some(
          (version) => version.gameSystemId === this.selectedGameSystem()?.id
        )
      );
    }

    // Filtrer par type de module
    if (this.selectedModuleType()) {
      modules = modules.filter(
        (module) => module.type === this.selectedModuleType()
      );
    }

    // Trier
    switch (this.sortBy()) {
      case 'title':
        modules.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'recent':
        modules.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case 'popular':
        // TODO: Implémenter le tri par popularité basé sur le nombre de sauvegardes
        break;
    }

    return modules;
  });

  async ngOnInit() {
    await this.loadInitialData();
  }

  private async loadInitialData() {
    this.loading.set(true);
    try {
      // Charger les modules publics, tags et systèmes de jeu en parallèle
      const [modules, tags, gameSystems] = await Promise.all([
        this.loadPublicModules(),
        this.tagHttpService.getAllTags(),
        this.gameSystemHttpService.getAllGameSystems(),
      ]);

      this.modules.set(modules);
      this.availableTags.set(tags);
      this.gameSystems.set(gameSystems);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadPublicModules(): Promise<Module[]> {
    // Pour l'instant, on utilise getAllModules mais idéalement il faudrait
    // une méthode getPublicModules() dans le service
    const allModules = await this.moduleHttpService.getAllModules();

    // Filtrer uniquement les modules avec au moins une version publiée
    return allModules.filter((module) =>
      module.versions.some((version) => version.published)
    );
  }

  onSearchChange(value: string) {
    this.searchTerm.set(value);
  }

  onTagToggle(tag: Tag) {
    const currentTags = this.selectedTags();
    const isSelected = currentTags.some((t) => t.id === tag.id);

    if (isSelected) {
      this.selectedTags.set(currentTags.filter((t) => t.id !== tag.id));
    } else {
      this.selectedTags.set([...currentTags, tag]);
    }
  }

  onGameSystemChange(gameSystem: GameSystem | null) {
    this.selectedGameSystem.set(gameSystem);
  }

  onModuleTypeChange(moduleType: EModuleType | null) {
    this.selectedModuleType.set(moduleType);
  }

  onSortChange(sortBy: 'recent' | 'popular' | 'title') {
    this.sortBy.set(sortBy);
  }

  clearFilters() {
    this.searchTerm.set('');
    this.selectedTags.set([]);
    this.selectedGameSystem.set(null);
    this.selectedModuleType.set(null);
    this.sortBy.set('recent');
  }

  isTagSelected(tag: Tag): boolean {
    return this.selectedTags().some((t) => t.id === tag.id);
  }
}

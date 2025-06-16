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
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { TranslateModule } from '@ngx-translate/core';
import { ModuleCardComponent } from '../../components/module-card/module-card.component';
import { ModuleHttpService } from '../../services/https/module-http.service';
import { TagHttpService } from '../../services/https/tag-http.service';
import { GameSystemHttpService } from '../../services/https/game-system-http.service';
import { Module } from '../../classes/Module';
import { Tag } from '../../classes/Tag';
import { GameSystem } from '../../classes/GameSystem';
import { EModuleType } from '../../enum/ModuleType';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

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
    PaginatorModule,
    TranslateModule,
    ModuleCardComponent,
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
  availableTags = signal<Tag[]>([]);
  gameSystems = signal<GameSystem[]>([]);
  loading = signal(false);

  // Pagination
  currentPage = signal(0);
  pageSize = signal(12);
  totalElements = signal(0);
  totalPages = signal(0);

  // Filtres
  searchTerm = signal('');
  selectedTags = signal<Tag[]>([]);
  selectedGameSystem = signal<GameSystem | null>(null);
  selectedModuleType = signal<EModuleType | null>(null);
  sortBy = signal<'recent' | 'popular' | 'title'>('recent');

  // Subject pour le debounce de la recherche
  private searchSubject = new Subject<string>();

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

  // Computed pour les modules affichés (maintenant utilisé seulement pour l'affichage)
  displayedModules = computed(() => this.modules());

  async ngOnInit() {
    await this.loadInitialData();
    this.setupSearchDebounce();
    await this.loadModules();
  }

  private setupSearchDebounce() {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((searchTerm) => {
        this.searchTerm.set(searchTerm);
        this.currentPage.set(0); // Reset à la première page
        this.loadModules();
      });
  }

  private async loadInitialData() {
    this.loading.set(true);
    try {
      // Charger tags et systèmes de jeu en parallèle
      const [tags, gameSystems] = await Promise.all([
        this.tagHttpService.getAllTags(),
        this.gameSystemHttpService.getAllGameSystems(),
      ]);

      this.availableTags.set(tags);
      this.gameSystems.set(gameSystems);
    } catch (error) {
      console.error('Erreur lors du chargement des données initiales:', error);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadModules() {
    this.loading.set(true);
    try {
      const response = await this.searchModules();

      this.modules.set(response.content);
      this.totalElements.set(response.totalElements);
      this.totalPages.set(response.totalPages);
    } catch (error) {
      console.error('Erreur lors du chargement des modules:', error);
      this.modules.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  private async searchModules(): Promise<PaginatedResponse<Module>> {
    // Construire les paramètres de recherche
    const params: {  
      page: number;
      size: number;
      sort: string;
      published: boolean;
      search?: string;
      tagIds?: string;
      gameSystemId?: number;
      moduleType?: string;
    } = {
      page: this.currentPage(),
      size: this.pageSize(),
      sort: this.getSortParameter(),
      published: true, // Seulement les modules publiés
    };

    // Ajouter les filtres s'ils sont définis
    if (this.searchTerm()) {
      params.search = this.searchTerm();
    }

    if (this.selectedTags().length > 0) {
      params.tagIds = this.selectedTags()
        .map((tag) => tag.id)
        .join(',');
    }

    if (this.selectedGameSystem()) {
      params.gameSystemId = this.selectedGameSystem()!.id;
    }

    if (this.selectedModuleType()) {
      params.moduleType = this.selectedModuleType()!.toString();
    }

    try {
      // Utiliser la vraie API de recherche
      return await this.moduleHttpService.searchModules(params);
    } catch (error) {
      console.error('Erreur API, fallback vers simulation:', error);
      // Fallback vers la simulation si l'API n'est pas encore disponible
      return this.mockPaginatedSearch(params);
    }
  }

  // Méthode de fallback pour simuler la recherche paginée
  // À supprimer quand l'API backend sera prête
  private async mockPaginatedSearch(
    params: {  
      page: number;
      size: number;
      sort: string;
      published: boolean;
      search?: string;
      tagIds?: string;
      gameSystemId?: number;
      moduleType?: string;
    }
  ): Promise<PaginatedResponse<Module>> {
    // Charger tous les modules publics pour la simulation
    const allModules = await this.loadPublicModules();

    // Appliquer les filtres
    let filteredModules = this.applyClientSideFilters(allModules);

    // Appliquer le tri
    filteredModules = this.applySorting(filteredModules);

    // Calculer la pagination
    const startIndex = params.page * params.size;
    const endIndex = startIndex + params.size;
    const paginatedModules = filteredModules.slice(startIndex, endIndex);

    return {
      content: paginatedModules,
      totalElements: filteredModules.length,
      totalPages: Math.ceil(filteredModules.length / params.size),
      size: params.size,
      number: params.page,
    };
  }

  private async loadPublicModules(): Promise<Module[]> {
    const allModules = await this.moduleHttpService.getAllModules();
    // Filtrer uniquement les modules avec au moins une version publiée
    return allModules.filter((module) =>
      module.versions.some((version) => version.published)
    );
  }

  private applyClientSideFilters(modules: Module[]): Module[] {
    let filtered = modules;

    // Filtrer par terme de recherche
    if (this.searchTerm()) {
      const searchLower = this.searchTerm().toLowerCase();
      filtered = filtered.filter(
        (module) =>
          module.title.toLowerCase().includes(searchLower) ||
          module.description.toLowerCase().includes(searchLower) ||
          module.creator?.username?.toLowerCase().includes(searchLower)
      );
    }

    // Filtrer par tags
    if (this.selectedTags().length > 0) {
      filtered = filtered.filter((module) =>
        this.selectedTags().some((selectedTag) =>
          module.tags.some((moduleTag) => moduleTag.id === selectedTag.id)
        )
      );
    }

    // Filtrer par système de jeu
    if (this.selectedGameSystem()) {
      filtered = filtered.filter((module) =>
        module.versions.some(
          (version) => version.gameSystemId === this.selectedGameSystem()?.id
        )
      );
    }

    // Filtrer par type de module
    if (this.selectedModuleType()) {
      filtered = filtered.filter(
        (module) => module.type === this.selectedModuleType()
      );
    }

    return filtered;
  }

  private applySorting(modules: Module[]): Module[] {
    const sorted = [...modules];

    switch (this.sortBy()) {
      case 'title':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'recent':
        sorted.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case 'popular':
        // TODO: Implémenter le tri par popularité basé sur le nombre de sauvegardes
        // Pour l'instant, on trie par date de création inverse
        sorted.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
    }

    return sorted;
  }

  private getSortParameter(): string {
    switch (this.sortBy()) {
      case 'title':
        return 'title,asc';
      case 'recent':
        return 'createdAt,desc';
      case 'popular':
        return 'createdAt,desc'; // Temporaire
      default:
        return 'createdAt,desc';
    }
  }

  // Méthodes d'événements
  onSearchChange(value: string) {
    this.searchSubject.next(value);
  }

  onTagToggle(tag: Tag) {
    const currentTags = this.selectedTags();
    const isSelected = currentTags.some((t) => t.id === tag.id);

    if (isSelected) {
      this.selectedTags.set(currentTags.filter((t) => t.id !== tag.id));
    } else {
      this.selectedTags.set([...currentTags, tag]);
    }

    // Recharger les modules avec les nouveaux filtres
    this.currentPage.set(0);
    this.loadModules();
  }

  onGameSystemChange(gameSystem: GameSystem | null) {
    this.selectedGameSystem.set(gameSystem);
    this.currentPage.set(0);
    this.loadModules();
  }

  onModuleTypeChange(moduleType: EModuleType | null) {
    this.selectedModuleType.set(moduleType);
    this.currentPage.set(0);
    this.loadModules();
  }

  onSortChange(sortBy: 'recent' | 'popular' | 'title') {
    this.sortBy.set(sortBy);
    this.currentPage.set(0);
    this.loadModules();
  }

  onPageChange(event: PaginatorState) {
    this.currentPage.set(event.page ?? 0);
    this.loadModules();
  }

  clearFilters() {
    this.searchTerm.set('');
    this.selectedTags.set([]);
    this.selectedGameSystem.set(null);
    this.selectedModuleType.set(null);
    this.sortBy.set('recent');
    this.currentPage.set(0);
    this.loadModules();
  }

  isTagSelected(tag: Tag): boolean {
    return this.selectedTags().some((t) => t.id === tag.id);
  }

  // Getters pour la pagination
  getPaginationInfo(): string {
    const start = this.currentPage() * this.pageSize() + 1;
    const end = Math.min(
      (this.currentPage() + 1) * this.pageSize(),
      this.totalElements()
    );
    return `${start}-${end} sur ${this.totalElements()}`;
  }
}

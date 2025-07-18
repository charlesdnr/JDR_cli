import { Component, computed, inject, OnInit, signal, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ChipModule } from 'primeng/chip';
import { SkeletonModule } from 'primeng/skeleton';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { TreeSelectModule } from 'primeng/treeselect';
import { ToastModule } from 'primeng/toast';
import { TranslateModule } from '@ngx-translate/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { ModuleCardComponent } from '../../components/module-card/module-card.component';
import { ModuleHttpService } from '../../services/https/module-http.service';
import { TagHttpService } from '../../services/https/tag-http.service';
import { GameSystemHttpService } from '../../services/https/game-system-http.service';
import { FolderService } from '../../services/folders.service';
import { UserSavedModuleHttpService } from '../../services/https/user-saved-module-http.service';
import { Module } from '../../classes/Module';
import { Tag } from '../../classes/Tag';
import { GameSystem } from '../../classes/GameSystem';
import { UserFolder } from '../../classes/UserFolder';
import { UserSavedModule } from '../../classes/UserSavedModule';
import { EModuleType } from '../../enum/ModuleType';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { TreeNode, MessageService } from 'primeng/api';
import { UserHttpService } from '../../services/https/user-http.service';
import { AuthenticationService } from '../../services/authentication.service';

interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

interface TagWithCount extends Tag {
  moduleCount?: number;
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
    SelectButtonModule,
    ChipModule,
    SkeletonModule,
    IconFieldModule,
    InputIconModule,
    PaginatorModule,
    TooltipModule,
    DialogModule,
    TreeSelectModule,
    ToastModule,
    TranslateModule,
    ModuleCardComponent,
  ],
  providers: [MessageService],
  templateUrl: './explore.component.html',
  styleUrl: './explore.component.scss',
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateY(-20px)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ transform: 'translateY(-20px)', opacity: 0 }))
      ])
    ]),
    trigger('fadeInUp', [
      transition(':enter', [
        style({ 
          transform: 'translateY(20px)', 
          opacity: 0,
          scale: '0.95'
        }),
        animate('400ms cubic-bezier(0.4, 0, 0.2, 1)', 
          style({ 
            transform: 'translateY(0)', 
            opacity: 1,
            scale: '1'
          })
        )
      ])
    ]),
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.8)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0, transform: 'scale(0.8)' }))
      ])
    ])
  ]
})
export class ExploreComponent implements OnInit {
  @ViewChild('searchInput') searchInput!: ElementRef;
  
  private moduleHttpService = inject(ModuleHttpService);
  private tagHttpService = inject(TagHttpService);
  private gameSystemHttpService = inject(GameSystemHttpService);
  private foldersService = inject(FolderService);
  private userSavedModuleHttpService = inject(UserSavedModuleHttpService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private userHttpService = inject(UserHttpService);
  private authService = inject(AuthenticationService);
  private messageService = inject(MessageService);

  // Signals pour l'état principal
  modules = signal<Module[]>([]);
  availableTags = signal<TagWithCount[]>([]);
  gameSystems = signal<GameSystem[]>([]);
  loading = signal(false);
  
  // UI State
  showFilters = signal(false);
  showScrollTop = signal(false);
  showSaveDialog = signal(false);
  moduleToSave = signal<Module | null>(null);
  selectedFolder = signal<TreeNode | null>(null);
  isGridView = signal(true);
  
  // Pagination
  currentPage = signal(0);
  pageSize = signal(12);
  totalElements = signal(0);
  totalPages = signal(0);

  // Filtres
  searchTerm = signal('');
  selectedTags = signal<TagWithCount[]>([]);
  selectedGameSystem = signal<GameSystem | null>(null);
  selectedModuleType = signal<EModuleType | null>(null);
  sortBy = signal<'recent' | 'popular' | 'title'>('recent');

  // Subject pour le debounce de la recherche
  private searchSubject = new Subject<string>();

  // Arrays pour l'affichage
  skeletonArray = Array.from({ length: 4 }, (_, i) => i);

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

  viewOptions = [
    { icon: 'pi pi-th-large', value: 'grid' },
    { icon: 'pi pi-list', value: 'list' }
  ];

  // Computed signals
  displayedModules = computed(() => this.modules());
  
  popularTags = computed(() => 
    this.availableTags()
      .slice()
      .sort((a, b) => (b.moduleCount || 0) - (a.moduleCount || 0))
      .slice(0, 20)
  );

  hasActiveFilters = computed(() => 
    this.searchTerm() !== '' ||
    this.selectedTags().length > 0 ||
    this.selectedGameSystem() !== null ||
    this.selectedModuleType() !== null ||
    this.sortBy() !== 'recent'
  );

  @HostListener('window:scroll', ['$event'])
  onWindowScroll() {
    this.showScrollTop.set(window.pageYOffset > 300);
  }

  async ngOnInit() {
    // Lire les paramètres de recherche depuis l'URL
    this.route.queryParams.subscribe(params => {
      if (params['search']) {
        this.searchTerm.set(params['search']);
      }
    });
    
    await this.initializeWithAuth();
  }
  
  private async initializeWithAuth() {
    try {
      // Wait for Firebase authentication to be ready before making HTTP calls
      // This ensures auth interceptor works properly
      await this.authService.waitForAuthReady();
    } catch (error) {
      console.error('Error waiting for authentication, continuing without auth:', error);
    }
    
    // Always try to load data regardless of auth status
    // The explore page should work for both authenticated and unauthenticated users
    await this.loadInitialData();
    this.setupSearchDebounce();
    await this.loadModules();
  }

  private setupSearchDebounce() {
    this.searchSubject
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((searchTerm) => {
        this.searchTerm.set(searchTerm);
        this.currentPage.set(0);
        this.loadModules();
      });
  }

  private async loadInitialData() {
    this.loading.set(true);
    try {
      // Load tags and game systems independently to prevent one failure from breaking everything
      const tagsPromise = this.tagHttpService.getAllTags().catch(error => {
        console.error('Erreur lors du chargement des tags:', error);
        return []; // Return empty array on error
      });
      
      const gameSystemsPromise = this.gameSystemHttpService.getAllGameSystems().catch(error => {
        console.error('Erreur lors du chargement des systèmes de jeu:', error);
        return []; // Return empty array on error
      });

      const [tags, gameSystems] = await Promise.all([tagsPromise, gameSystemsPromise]);

      // Simuler un moduleCount pour les tags (à remplacer par vraies données API)
      const tagsWithCount = tags.map((tag: Tag) => ({
        ...tag,
        moduleCount: Math.floor(Math.random() * 50) + 1
      }));

      this.availableTags.set(tagsWithCount);
      this.gameSystems.set(gameSystems);
    } catch (error) {
      console.error('Erreur lors du chargement des données initiales:', error);
      // Set empty arrays to prevent UI errors
      this.availableTags.set([]);
      this.gameSystems.set([]);
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
      published: true,
    };

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
      return await this.moduleHttpService.searchModules(params);
    } catch (error: unknown) {
      console.error('Erreur API lors de la recherche de modules:', error);
      const errorObj = error as { status?: number; message?: string };
      console.log('Status:', errorObj?.status, 'Message:', errorObj?.message || error);
      
      // For any API error (400, 403, 500, etc.), fallback to mock data
      // This ensures the explore page works even when backend is not properly configured
      console.log('Utilisation des données de simulation pour la recherche...');
      return this.mockPaginatedSearch(params);
    }
  }

  private async mockPaginatedSearch(params: { page: number; size: number; [key: string]: unknown }): Promise<PaginatedResponse<Module>> {
    const allModules = await this.loadPublicModules();
    let filteredModules = this.applyClientSideFilters(allModules);
    filteredModules = this.applySorting(filteredModules);

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
    try {
      const allModules = await this.moduleHttpService.getAllModules();
      return allModules.filter((module) =>
        module.versions.some((version) => version.published)
      );
    } catch (error) {
      console.error('Erreur lors du chargement des modules publics:', error);
      // Return empty array if unable to load modules from API
      // This prevents the explore page from breaking completely
      return [];
    }
  }

  private applyClientSideFilters(modules: Module[]): Module[] {
    let filtered = modules;

    if (this.searchTerm()) {
      const searchLower = this.searchTerm().toLowerCase();
      filtered = filtered.filter(
        (module) =>
          module.title.toLowerCase().includes(searchLower) ||
          module.description.toLowerCase().includes(searchLower) ||
          module.creator?.username?.toLowerCase().includes(searchLower)
      );
    }

    if (this.selectedTags().length > 0) {
      filtered = filtered.filter((module) =>
        this.selectedTags().some((selectedTag) =>
          module.tags.some((moduleTag) => moduleTag.id === selectedTag.id)
        )
      );
    }

    if (this.selectedGameSystem()) {
      filtered = filtered.filter((module) =>
        module.versions.some(
          (version) => version.gameSystemId === this.selectedGameSystem()?.id
        )
      );
    }

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
        return 'createdAt,desc';
      default:
        return 'createdAt,desc';
    }
  }

  // Méthodes UI
  toggleFilters() {
    this.showFilters.update(show => !show);
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Méthodes d'événements
  onSearchChange(value: string) {
    this.searchSubject.next(value);
  }

  onTagToggle(tag: TagWithCount) {
    const currentTags = this.selectedTags();
    const isSelected = currentTags.some((t) => t.id === tag.id);

    if (isSelected) {
      this.selectedTags.set(currentTags.filter((t) => t.id !== tag.id));
    } else {
      this.selectedTags.set([...currentTags, tag]);
    }

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

  onSortChange(sortBy: 'recent' | 'popular' | 'title' | string) {
    this.sortBy.set(sortBy as 'recent' | 'popular' | 'title');
    this.currentPage.set(0);
    this.loadModules();
  }

  onPageChange(event: PaginatorState) {
    this.currentPage.set(event.page ?? 0);
    this.loadModules();
    this.scrollToTop();
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

  // Méthodes utilitaires
  isTagSelected(tag: TagWithCount): boolean {
    return this.selectedTags().some((t) => t.id === tag.id);
  }

  getTagSize(tag: TagWithCount): string {
    const count = tag.moduleCount || 0;
    const maxCount = Math.max(...this.popularTags().map(t => t.moduleCount || 0));
    const size = 0.8 + (count / maxCount) * 0.4; // Entre 0.8 et 1.2
    return size.toString();
  }

  getPaginationInfo(): string {
    const start = this.currentPage() * this.pageSize() + 1;
    const end = Math.min(
      (this.currentPage() + 1) * this.pageSize(),
      this.totalElements()
    );
    return `${start}-${end} sur ${this.totalElements()}`;
  }

  // Nouvelles méthodes pour les actions
  quickPreview(module: Module) {
    this.router.navigate(['/module', module.id]);
  }

  async toggleSave(module: Module) {
    this.moduleToSave.set(module);
    this.showSaveDialog.set(true);
    await this.loadUserFolders();
  }

  isSaved(module: Module): boolean {
    // TODO: Vérifier si le module est sauvegardé pour l'utilisateur actuel
    // console.log('Check if saved:', module.title);
    return module ? false : false;
  }

  // Gestion des dossiers
  userFolders = signal<TreeNode[]>([]);
  savingModule = signal(false);

  private async loadUserFolders() {
    try {
      const folders = await this.foldersService.forceReloadFolders();
      this.userFolders.set(this.buildFolderTree(folders));
    } catch (error) {
      console.error('Erreur lors du chargement des dossiers:', error);
    }
  }

  private buildFolderTree(folders: UserFolder[]): TreeNode[] {
    const rootFolders = folders.filter(folder => !folder.parentFolder);
    return rootFolders.map(folder => this.buildTreeNode(folder, folders));
  }

  private buildTreeNode(folder: UserFolder, allFolders: UserFolder[]): TreeNode {
    const children = allFolders
      .filter(f => f.parentFolder === folder.folderId)
      .map(child => this.buildTreeNode(child, allFolders));

    return {
      key: folder.folderId?.toString() || '0',
      label: folder.name || 'Dossier sans nom',
      data: folder,
      children: children.length > 0 ? children : undefined,
      leaf: children.length === 0,
      selectable: true
    };
  }

  async saveToFolder() {
    const module = this.moduleToSave();
    const folder = this.selectedFolder();
    
    if (!module || !folder) return;

    this.savingModule.set(true);

    try {
      const currentUser = this.userHttpService.currentJdrUser();
      if (!currentUser) {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Vous devez être connecté pour sauvegarder un module'
        });
        return;
      }

      const savedModule = new UserSavedModule(
        currentUser.id,
        module.id,
        module.versions[0]?.id || 0,
        parseInt(folder.key!)
      );
      
      await this.userSavedModuleHttpService.saveModule(savedModule);
      
      // Succès - fermer la modal et afficher un message
      this.showSaveDialog.set(false);
      this.moduleToSave.set(null);
      this.selectedFolder.set(null);
      
      this.messageService.add({
        severity: 'success',
        summary: 'Succès',
        detail: `Le module "${module.title}" a été sauvegardé dans le dossier "${folder.label}"`
      });
      
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur de sauvegarde',
        detail: 'Impossible de sauvegarder le module. Veuillez réessayer.'
      });
    } finally {
      this.savingModule.set(false);
    }
  }

  cancelSave() {
    this.showSaveDialog.set(false);
    this.moduleToSave.set(null);
    this.selectedFolder.set(null);
  }

  async shareModule(module: Module) {
    const moduleUrl = `${window.location.origin}/module/${module.id}`;
    
    try {
      // Utiliser l'API Web Share native si disponible (sur mobile principalement)
      if (navigator.share) {
        await navigator.share({
          title: module.title,
          text: module.description || `Découvrez ce module RPG : ${module.title}`,
          url: moduleUrl
        });
        
        this.messageService.add({
          severity: 'success',
          summary: 'Partage',
          detail: 'Module partagé avec succès',
          life: 3000
        });
      } else {
        // Fallback - copier le lien dans le presse-papiers
        await navigator.clipboard.writeText(moduleUrl);
        
        this.messageService.add({
          severity: 'success',
          summary: 'Lien copié',
          detail: 'Le lien du module a été copié dans le presse-papiers',
          life: 3000
        });
      }
    } catch (error) {
      console.error('Erreur lors du partage:', error);
      
      // Fallback ultime si clipboard échoue aussi
      try {
        await navigator.clipboard.writeText(moduleUrl);
        this.messageService.add({
          severity: 'success',
          summary: 'Lien copié',
          detail: 'Le lien du module a été copié dans le presse-papiers',
          life: 3000
        });
      } catch (clipboardError) {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de partager le module. Copiez manuellement ce lien : ' + moduleUrl,
          life: 5000
        });
      }
    }
  }

  // Méthodes d'UI supplémentaires
  showAllModules() {
    this.clearFilters();
    this.showFilters.set(false);
  }

}
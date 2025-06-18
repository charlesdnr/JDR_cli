import { Component, OnInit, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { TabsModule } from 'primeng/tabs';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { BadgeModule } from 'primeng/badge';
import { AvatarModule } from 'primeng/avatar';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';
import { DataViewModule } from 'primeng/dataview';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { RatingModule } from 'primeng/rating';
import { ImageModule } from 'primeng/image';
import { AccordionModule } from 'primeng/accordion';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { User } from '../../classes/User';
import { UserProfile } from '../../classes/UserProfile';
import { ModuleSummary } from '../../classes/ModuleSummary';
import { UserSubscription } from '../../classes/UserSubscription';
import { UserHttpService } from '../../services/https/user-http.service';
import { ModuleHttpService } from '../../services/https/module-http.service';
import { UserProfileHttpService } from '../../services/https/user-profile-http.service';
import { ModuleRatingsHttpService } from '../../services/https/module-ratings-http.service';
import { ModuleCardComponent } from '../../components/module-card/module-card.component';

interface RealUserStats {
  totalModules: number;
  publishedModules: number;
  totalViews: number;
  followers: number;
  averageRating: number;
  joinedDate: Date;
}

interface ModuleFilter {
  label: string;
  value: string;
  icon: string;
}

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    ChipModule,
    TabsModule,
    SkeletonModule,
    TagModule,
    BadgeModule,
    AvatarModule,
    DividerModule,
    TooltipModule,
    DataViewModule,
    SelectModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    RatingModule,
    ImageModule,
    AccordionModule,
    ScrollPanelModule,
    ToastModule,
    ModuleCardComponent
  ],
  providers: [MessageService],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.scss'
})
export class UserProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private userService = inject(UserHttpService);
  private moduleService = inject(ModuleHttpService);
  private userProfileService = inject(UserProfileHttpService);
  private moduleRatingsService = inject(ModuleRatingsHttpService);
  private messageService = inject(MessageService);

  // Signals principales
  userId = signal<number | null>(null);
  user = signal<User | null>(null);
  userProfile = signal<UserProfile | null>(null);
  userModules = signal<ModuleSummary[]>([]);
  userStats = signal<RealUserStats | null>(null);
  userSubscription = signal<UserSubscription | null>(null);
  userSubscribers = signal<UserSubscription[]>([]);
  isLoading = signal(true);
  isFollowing = signal(false);
  
  // État de l'interface
  selectedTab = signal<number>(0);
  searchQuery = signal('');
  selectedFilter = signal('all');
  isImageLoading = signal(true);
  private viewIncremented = false;

  // Options de filtrage
  filterOptions: ModuleFilter[] = [
    { label: 'Tous les modules', value: 'all', icon: 'pi pi-list' },
    { label: 'Publiés', value: 'published', icon: 'pi pi-check-circle' },
    { label: 'Brouillons', value: 'draft', icon: 'pi pi-file-edit' },
    { label: 'Récents', value: 'recent', icon: 'pi pi-clock' }
  ];

  // Propriétés calculées
  currentUser = computed(() => this.userService.currentJdrUser());
  
  isOwnProfile = computed(() => 
    this.currentUser()?.id === this.user()?.id
  );

  userDisplayName = computed(() => {
    const user = this.user();
    return user?.username || 'Utilisateur';
  });

  userInitials = computed(() => {
    const displayName = this.userDisplayName();
    return displayName
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  });

  profileImageUrl = computed(() => {
    const profile = this.userProfile();
    return profile?.picture?.src || null;
  });

  filteredModules = computed(() => {
    let modules = this.userModules();
    const query = this.searchQuery().toLowerCase();
    const filter = this.selectedFilter();

    // Filtrage par recherche
    if (query) {
      modules = modules.filter(module => 
        module.title.toLowerCase().includes(query) ||
        module.description.toLowerCase().includes(query)
      );
    }

    // Filtrage par type
    switch (filter) {
      case 'published':
        modules = modules.filter(module => 
          module.versions.some(v => v.published)
        );
        break;
      case 'draft':
        modules = modules.filter(module => 
          !module.versions.some(v => v.published)
        );
        break;
      case 'recent':
        modules = [...modules].sort((a, b) => 
          b.id - a.id // Tri par ID décroissant comme approximation de la récence
        );
        break;
    }

    return modules;
  });

  memberSince = computed(() => {
    // Comme la classe User n'a pas de createdAt, on utilise une valeur par défaut
    // Vous pourriez ajouter cette propriété à la classe User si nécessaire
    const defaultDate = new Date('2024-01-01'); // Date par défaut
    return defaultDate.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long'
    });
  });

  constructor() {
    effect(() => {
      const userId = this.route.snapshot.paramMap.get('userId');
      if (userId) {
        const newUserId = parseInt(userId);
        const currentUserId = this.userId();
        
        if (currentUserId !== newUserId) {
          this.viewIncremented = false;
          this.resetState();
        }
        
        this.userId.set(newUserId);
        this.loadUserProfile();
      }
    });
  }

  ngOnInit() {
    const userId = this.route.snapshot.paramMap.get('userId');
    if (userId) {
      this.userId.set(parseInt(userId));
      this.loadUserProfile();
    }
  }

  private resetState() {
    this.isLoading.set(true);
    this.user.set(null);
    this.userProfile.set(null);
    this.userModules.set([]);
    this.userStats.set(null);
    this.userSubscription.set(null);
    this.userSubscribers.set([]);
    this.isFollowing.set(false);
    this.selectedTab.set(0);
    this.searchQuery.set('');
    this.selectedFilter.set('all');
  }

  async loadUserProfile() {
    this.isLoading.set(true);
    
    try {
      const userId = this.userId();
      if (!userId) return;

      // Charger toutes les données en parallèle
      const [user, userProfile, modules, userSubscription, userSubscribers, userViews] = await Promise.all([
        this.userService.getUserById(userId),
        this.userProfileService.getUserProfileByUserId(userId).catch(() => null),
        this.moduleService.getModulesSummaryByUserId(userId),
        this.userProfileService.getUserSubscription(userId).catch(() => null),
        this.userProfileService.getUserSubscribers(userId).catch(() => []),
        this.userProfileService.getuserViews(userId).catch(() => 0)
      ]);

      // Calculer la note moyenne réelle des modules de l'utilisateur
      const averageRating = await this.calculateUserAverageRating(modules);

      this.user.set(user);
      this.userProfile.set(userProfile);
      this.userModules.set(modules);
      this.userSubscription.set(userSubscription);
      this.userSubscribers.set(userSubscribers);
      this.isFollowing.set(userSubscription !== null);

      // Générer les vraies statistiques
      this.generateRealUserStats(user, modules, userSubscribers, userViews, averageRating);

      // Incrémenter les vues si ce n'est pas le profil de l'utilisateur connecté
      if (!this.isOwnProfile() && !this.viewIncremented) {
        this.incrementProfileView(userId);
        this.viewIncremented = true;
      }

    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Impossible de charger le profil utilisateur'
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  private async calculateUserAverageRating(modules: ModuleSummary[]): Promise<number> {
    try {
      const publishedModules = modules.filter(m => m.versions.some(v => v.published));
      if (publishedModules.length === 0) return 0;

      const ratings: number[] = [];
      
      for (const module of publishedModules) {
        const publishedVersion = module.versions.find(v => v.published);
        if (publishedVersion?.id) {
          try {
            const ratingsData = await this.moduleRatingsService.getModuleRatingsByModuleVersion(publishedVersion.id);
            if (ratingsData.versionAverageRating > 0) {
              ratings.push(ratingsData.versionAverageRating);
            }
          } catch {
            // Ignorer les erreurs pour les modules sans évaluations
          }
        }
      }

      return ratings.length > 0 
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
        : 0;
    } catch {
      return 0;
    }
  }

  private generateRealUserStats(
    user: User, 
    modules: ModuleSummary[], 
    subscribers: UserSubscription[], 
    views: number,
    averageRating: number
  ) {
    const publishedModules = modules.filter(m => 
      m.versions.some(v => v.published)
    ).length;

    const stats: RealUserStats = {
      totalModules: modules.length,
      publishedModules,
      totalViews: views,
      followers: subscribers.length,
      averageRating,
      joinedDate: new Date('2024-01-01') // Date par défaut
    };

    this.userStats.set(stats);
  }

  async toggleFollow() {
    const userId = this.userId();
    if (!userId) return;

    try {
      if (this.isFollowing()) {
        await this.userProfileService.unsubscribeFromUserProfile(userId);
        this.isFollowing.set(false);
        this.userSubscription.set(null);
        this.messageService.add({
          severity: 'info',
          summary: 'Désabonnement',
          detail: 'Vous ne suivez plus cet utilisateur'
        });
      } else {
        const subscription = await this.userProfileService.subscribeToUserProfile(userId);
        this.isFollowing.set(true);
        this.userSubscription.set(subscription);
        this.messageService.add({
          severity: 'success',
          summary: 'Abonnement',
          detail: 'Vous suivez maintenant cet utilisateur'
        });
      }
      
      // Recharger les abonnés pour mettre à jour le compteur
      const updatedSubscribers = await this.userProfileService.getUserSubscribers(userId);
      this.userSubscribers.set(updatedSubscribers);
      
      // Mettre à jour les statistiques
      const user = this.user();
      const modules = this.userModules();
      const currentViews = this.userStats()?.totalViews || 0;
      const currentRating = this.userStats()?.averageRating || 0;
      
      if (user && modules) {
        this.generateRealUserStats(user, modules, updatedSubscribers, currentViews, currentRating);
      }
    } catch (error) {
      console.error('Erreur lors du toggle follow:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Impossible de modifier l\'abonnement'
      });
    }
  }

  private async incrementProfileView(userId: number) {
    try {
      await this.userProfileService.incrementUserViews(userId);
      
      const currentStats = this.userStats();
      if (currentStats) {
        const updatedStats = {
          ...currentStats,
          totalViews: currentStats.totalViews + 1
        };
        this.userStats.set(updatedStats);
      }
    } catch (error) {
      console.error('Erreur lors de l\'incrémentation des vues:', error);
    }
  }

  openModule(moduleId: number) {
    this.router.navigate(['/module', moduleId]);
  }

  shareProfile() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      this.messageService.add({
        severity: 'success',
        summary: 'Lien copié',
        detail: 'Le lien du profil a été copié dans le presse-papiers'
      });
    });
  }

  onSearchChange(query: string) {
    this.searchQuery.set(query);
  }

  onFilterChange(filter: string) {
    this.selectedFilter.set(filter);
  }

  onTabChange(event: { index: number }) {
    this.selectedTab.set(event.index);
  }

  onImageLoad() {
    this.isImageLoading.set(false);
  }

  onImageError() {
    this.isImageLoading.set(false);
  }

  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  }

  getRatingStars(rating: number): { filled: number; partial: number; empty: number } {
    const filled = Math.floor(rating);
    const partial = rating - filled >= 0.5 ? 1 : 0;
    const empty = 5 - filled - partial;
    
    return { filled, partial, empty };
  }
}
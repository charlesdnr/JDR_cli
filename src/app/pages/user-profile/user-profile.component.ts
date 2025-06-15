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
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';
import { DataViewModule } from 'primeng/dataview';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

import { User } from '../../classes/User';
import { ModuleSummary } from '../../classes/ModuleSummary';
import { UserSubscription } from '../../classes/UserSubscription';
import { UserHttpService } from '../../services/https/user-http.service';
import { ModuleHttpService } from '../../services/https/module-http.service';
import { UserProfileHttpService } from '../../services/https/user-profile-http.service';
import { ModuleCardComponent } from '../../components/module-card/module-card.component';

interface UserStats {
  totalModules: number;
  publishedModules: number;
  totalViews: number;
  followers: number;
  following: number;
  joinDate: string;
  lastActive: string;
  favoriteGenres: string[];
  completionRate: number;
  avgRating: number;
}

interface ModuleFilter {
  label: string;
  value: string;
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
    ProgressBarModule,
    TooltipModule,
    DataViewModule,
    SelectModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    ModuleCardComponent
  ],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.scss'
})
export class UserProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private userService = inject(UserHttpService);
  private moduleService = inject(ModuleHttpService);
  private userProfileService = inject(UserProfileHttpService);

  // Signals
  userId = signal<number | null>(null);
  user = signal<User | null>(null);
  userModules = signal<ModuleSummary[]>([]);
  userStats = signal<UserStats | null>(null);
  userSubscription = signal<UserSubscription | null>(null);
  userSubscribers = signal<UserSubscription[]>([]);
  isLoading = signal(true);
  isFollowing = signal(false);
  
  // Track if we've already incremented view for this session to avoid multiple increments
  private viewIncremented = false;
  
  // Filter and search
  searchQuery = signal('');
  selectedFilter = signal('all');
  filterOptions: ModuleFilter[] = [
    { label: 'Tous les modules', value: 'all' },
    { label: 'Publiés', value: 'published' },
    { label: 'Brouillons', value: 'draft' },
    { label: 'Récents', value: 'recent' },
    { label: 'Populaires', value: 'popular' }
  ];

  // Computed properties
  currentUser = computed(() => this.userService.currentJdrUser());
  isOwnProfile = computed(() => 
    this.currentUser()?.id === this.user()?.id
  );

  filteredModules = computed(() => {
    let modules = this.userModules();
    const query = this.searchQuery().toLowerCase();
    const filter = this.selectedFilter();

    // Apply search
    if (query) {
      modules = modules.filter(module => 
        module.title.toLowerCase().includes(query) ||
        module.description.toLowerCase().includes(query)
      );
    }

    // Apply filter
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
          new Date(b.versions[0]?.updatedAt || 0).getTime() - 
          new Date(a.versions[0]?.updatedAt || 0).getTime()
        );
        break;
      case 'popular':
        // Sort by hypothetical popularity metric
        modules = [...modules].sort((a, b) => b.id - a.id);
        break;
    }

    return modules;
  });

  constructor() {
    // Watch for route parameter changes
    effect(() => {
      const userId = this.route.snapshot.paramMap.get('userId');
      if (userId) {
        const newUserId = parseInt(userId);
        const currentUserId = this.userId();
        
        // Reset view tracking when changing users
        if (currentUserId !== newUserId) {
          this.viewIncremented = false;
        }
        
        this.userId.set(newUserId);
        this.loadUserProfile();
      }
    });
  }

  ngOnInit() {
    // Initial load if userId is already available
    const userId = this.route.snapshot.paramMap.get('userId');
    if (userId) {
      this.userId.set(parseInt(userId));
      this.loadUserProfile();
    }
  }

  async loadUserProfile() {
    this.isLoading.set(true);
    
    try {
      const userId = this.userId();
      if (!userId) return;

      // Load user data, modules, subscription data, and views in parallel
      const [user, modules, userSubscription, userSubscribers, userViews] = await Promise.all([
        this.userService.getUserById(userId),
        this.moduleService.getModulesSummaryByUserId(userId),
        this.userProfileService.getUserSubscription(userId).catch(() => null),
        this.userProfileService.getUserSubscribers(userId).catch(() => []),
        this.userProfileService.getuserViews(userId).catch(() => 0)
      ]);

      this.user.set(user);
      this.userModules.set(modules);
      this.userSubscription.set(userSubscription);
      this.userSubscribers.set(userSubscribers);

      // Generate stats with real subscription and view data
      this.generateUserStats(user, modules, userSubscribers, userViews);

      // Check if following based on subscription data
      this.isFollowing.set(userSubscription !== null);

      // Increment view count for this profile visit (only if it's not the user's own profile and not already incremented)
      if (!this.isOwnProfile() && !this.viewIncremented) {
        this.incrementProfileView(userId);
        this.viewIncremented = true;
      }

    } catch (error) {
      console.error('Error loading user profile:', error);
      // Handle error (maybe redirect to 404)
    } finally {
      this.isLoading.set(false);
    }
  }

  private generateUserStats(user: User, modules: ModuleSummary[], subscribers: UserSubscription[], views: number) {
    const publishedModules = modules.filter(m => 
      m.versions.some(v => v.published)
    ).length;

    const stats: UserStats = {
      totalModules: modules.length,
      publishedModules: publishedModules,
      totalViews: views, // Use real view count from API
      followers: subscribers.length, // Use real subscriber count
      following: Math.floor(Math.random() * 200) + 20,
      joinDate: '2023-01-15', // Mock date
      lastActive: '2024-06-14',
      favoriteGenres: ['Fantasy', 'Sci-Fi', 'Horror'],
      completionRate: Math.floor(Math.random() * 30) + 70,
      avgRating: Math.random() * 2 + 3 // 3-5 stars
    };

    this.userStats.set(stats);
  }

  // Follow/Unfollow methods
  async toggleFollow() {
    const userId = this.userId();
    if (!userId) return;

    try {
      if (this.isFollowing()) {
        // Unfollow
        await this.userProfileService.unsubscribeFromUserProfile(userId);
        this.isFollowing.set(false);
        this.userSubscription.set(null);
      } else {
        // Follow
        const subscription = await this.userProfileService.subscribeToUserProfile(userId);
        this.isFollowing.set(true);
        this.userSubscription.set(subscription);
      }
      
      // Reload subscribers to update follower count
      const updatedSubscribers = await this.userProfileService.getUserSubscribers(userId);
      this.userSubscribers.set(updatedSubscribers);
      
      // Update stats with new follower count and current view count
      const user = this.user();
      const modules = this.userModules();
      const currentViews = this.userStats()?.totalViews || 0;
      if (user && modules) {
        this.generateUserStats(user, modules, updatedSubscribers, currentViews);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  }

  // Method to increment profile view count
  private async incrementProfileView(userId: number) {
    try {
      // Call the API to increment view count on the backend
      await this.userProfileService.incrementUserViews(userId);
      
      // Update local stats to reflect the change immediately
      const currentStats = this.userStats();
      if (currentStats) {
        const updatedStats = {
          ...currentStats,
          totalViews: currentStats.totalViews + 1
        };
        this.userStats.set(updatedStats);
      }
    } catch (error) {
      console.error('Error incrementing profile view:', error);
    }
  }

  // Method to decrement profile view count (if needed for specific use cases)
  async decrementProfileView(userId: number) {
    try {
      // Call the API to decrement view count on the backend
      await this.userProfileService.decrementUserViews(userId);
      
      // Update local stats to reflect the change immediately
      const currentStats = this.userStats();
      if (currentStats && currentStats.totalViews > 0) {
        const updatedStats = {
          ...currentStats,
          totalViews: currentStats.totalViews - 1
        };
        this.userStats.set(updatedStats);
      }
    } catch (error) {
      console.error('Error decrementing profile view:', error);
    }
  }

  openModule(moduleId: number) {
    this.router.navigate(['/module', moduleId]);
  }

  shareProfile() {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    // Show success message
  }

  onSearchChange(query: string) {
    this.searchQuery.set(query);
  }

  onFilterChange(filter: string) {
    this.selectedFilter.set(filter);
  }

  getJoinedDuration(): string {
    const stats = this.userStats();
    if (!stats) return '';
    
    const joinDate = new Date(stats.joinDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - joinDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) return `${diffDays} jours`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} mois`;
    return `${Math.floor(diffDays / 365)} ans`;
  }

  getStarArray(rating: number): boolean[] {
    return Array(5).fill(false).map((_, i) => i < Math.floor(rating));
  }
}
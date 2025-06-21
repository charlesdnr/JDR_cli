import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TreeSelectModule } from 'primeng/treeselect';
import { RippleModule } from 'primeng/ripple';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { trigger, transition, style, animate, state } from '@angular/animations';
import { TreeNode } from 'primeng/api';

import { ModuleHttpService } from '../../services/https/module-http.service';
import { GameSystemHttpService } from '../../services/https/game-system-http.service';
import { FolderService } from '../../services/folders.service';
import { UserHttpService } from '../../services/https/user-http.service';
import { UserSavedModuleHttpService } from '../../services/https/user-saved-module-http.service';

import { ModuleRequest } from '../../classes/ModuleRequest';
import { GameSystem } from '../../classes/GameSystem';
import { UserSavedModule } from '../../classes/UserSavedModule';
import { Picture } from '../../classes/Picture';
import { EModuleType } from '../../enum/ModuleType';

export interface CreateModuleStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}

@Component({
  selector: 'app-create-module-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TreeSelectModule,
    RippleModule,
    ProgressSpinnerModule,
    DividerModule,
    TooltipModule
  ],
  templateUrl: './create-module-modal.component.html',
  styleUrl: './create-module-modal.component.scss',
  animations: [
    trigger('slideTransition', [
      transition('* => next', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms cubic-bezier(0.25, 0.8, 0.25, 1)', style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      transition('* => prev', [
        style({ transform: 'translateX(-100%)', opacity: 0 }),
        animate('300ms cubic-bezier(0.25, 0.8, 0.25, 1)', style({ transform: 'translateX(0)', opacity: 1 }))
      ])
    ]),
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
      ])
    ]),
    trigger('progressBar', [
      state('*', style({ width: '{{ width }}%' }), { params: { width: 0 } })
    ])
  ]
})
export class CreateModuleModalComponent implements OnInit {
  private moduleHttpService = inject(ModuleHttpService);
  private gameSystemService = inject(GameSystemHttpService);
  private folderService = inject(FolderService);
  private userService = inject(UserHttpService);
  private userSavedModuleService = inject(UserSavedModuleHttpService);
  private router = inject(Router);
  private messageService = inject(MessageService);
  public dialogRef = inject(DynamicDialogRef);
  public config = inject(DynamicDialogConfig);

  // Modal state
  currentStep = signal(1);
  isCreating = signal(false);
  slideDirection = signal<'next' | 'prev'>('next');
  
  // Form data
  creationType = signal<'blank' | 'ai' | 'template' | 'import'>('blank');
  moduleTitle = signal('');
  moduleType = signal<EModuleType>(EModuleType.Scenario);
  selectedGameSystem = signal<GameSystem | null>(null);
  selectedFolder = signal<TreeNode | null>(null);

  // Data
  gameSystems = signal<GameSystem[]>([]);
  folders = signal<TreeNode[]>([]);
  loadingGameSystems = signal(false);
  loadingFolders = signal(false);

  // Computed
  canProceedToStep2 = computed(() => this.creationType() !== null);
  canProceedToStep3 = computed(() => {
    return this.moduleTitle().trim().length >= 3;
  });
  canCreate = computed(() => {
    return this.moduleTitle().trim().length >= 3 && 
           this.selectedFolder() !== null;
  });

  currentUser = computed(() => this.userService.currentJdrUser());

  progressWidth = computed(() => {
    return (this.currentStep() / 3) * 100;
  });

  // Computed for template bindings
  selectedFolderLabel = computed(() => {
    const selected = this.selectedFolder();
    if (!selected) return 'Aucun';
    
    // If it's a TreeNode object, get its label
    if (typeof selected === 'object' && selected.label) {
      return selected.label;
    }
    
    // If it's a key, find the corresponding folder
    const folder = this.folders().find(f => f.key === selected);
    return folder?.label || 'Aucun';
  });

  selectedCreationTypeTitle = computed(() => {
    const option = this.creationOptions.find(o => o.type === this.creationType());
    return option?.title || 'Non défini';
  });

  selectedModuleTypeLabel = computed(() => {
    const type = this.moduleTypes.find(t => t.value === this.moduleType());
    return type?.label || 'Scénario';
  });

  // Module types for select
  moduleTypes = [
    { label: 'Scénario', value: EModuleType.Scenario },
    { label: 'Univers', value: EModuleType.Lore },
    { label: 'Objet de jeu', value: EModuleType.GameItem },
    { label: 'Pack', value: EModuleType.Bundle },
    { label: 'Autre', value: EModuleType.Other }
  ];

  steps: CreateModuleStep[] = [
    {
      id: 1,
      title: 'Type de création',
      description: 'Choisissez comment créer votre module',
      completed: false
    },
    {
      id: 2,
      title: 'Informations essentielles',
      description: 'Configurez les paramètres de base',
      completed: false
    },
    {
      id: 3,
      title: 'Finalisation',
      description: 'Organisez et créez votre module',
      completed: false
    }
  ];

  creationOptions = [
    {
      type: 'blank' as const,
      icon: '📄',
      title: 'Module vierge',
      description: 'Commencer avec un module vide',
      badge: 'Recommandé',
      primary: true
    },
    {
      type: 'ai' as const,
      icon: '🤖',
      title: 'Généré par IA',
      description: 'Créer du contenu automatiquement',
      badge: 'Nouveau',
      primary: false
    },
    {
      type: 'template' as const,
      icon: '📋',
      title: 'Depuis un template',
      description: 'Utiliser un modèle existant',
      badge: '',
      primary: false
    },
    {
      type: 'import' as const,
      icon: '📥',
      title: 'Importer un fichier',
      description: 'Charger depuis un fichier',
      badge: 'Bientôt',
      primary: false,
      disabled: true
    }
  ];

  async ngOnInit() {
    await this.loadGameSystems();
    await this.loadFolders();
  }

  async loadGameSystems() {
    this.loadingGameSystems.set(true);
    try {
      const systems = await this.gameSystemService.getAllGameSystems();
      this.gameSystems.set(systems);
    } catch (error) {
      console.error('Erreur lors du chargement des systèmes de jeu:', error);
    } finally {
      this.loadingGameSystems.set(false);
    }
  }

  async loadFolders() {
    this.loadingFolders.set(true);
    try {
      await this.folderService.loadFolders();
      const userFolders = this.folderService.currentFolders();
      
      // Convert to tree structure for TreeSelect
      const treeNodes: TreeNode[] = userFolders.map(folder => ({
        key: folder.folderId?.toString() || '',
        label: folder.name || 'Dossier sans nom',
        data: folder,
        icon: 'pi pi-folder'
      }));
      
      this.folders.set(treeNodes);
      
      // Auto-select first folder if available
      if (treeNodes.length > 0) {
        this.selectedFolder.set(treeNodes[0]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des dossiers:', error);
      // En cas d'erreur, créer un dossier par défaut pour éviter les blocages
      this.folders.set([{
        key: '1',
        label: 'Mes modules',
        data: { folderId: 1, name: 'Mes modules' },
        icon: 'pi pi-folder'
      }]);
      this.selectedFolder.set({
        key: '1',
        label: 'Mes modules',
        data: { folderId: 1, name: 'Mes modules' },
        icon: 'pi pi-folder'
      });
    } finally {
      this.loadingFolders.set(false);
    }
  }

  selectCreationType(type: 'blank' | 'ai' | 'template' | 'import') {
    if (type === 'import') return; // Disabled for now
    this.creationType.set(type);
  }

  nextStep() {
    const current = this.currentStep();
    if (current < 3) {
      this.steps[current - 1].completed = true;
      this.slideDirection.set('next');
      this.currentStep.set(current + 1);
    }
  }

  prevStep() {
    const current = this.currentStep();
    if (current > 1) {
      this.slideDirection.set('prev');
      this.currentStep.set(current - 1);
    }
  }

  goToStep(step: number) {
    if (step <= this.currentStep() || this.steps[step - 1].completed) {
      this.slideDirection.set(step > this.currentStep() ? 'next' : 'prev');
      this.currentStep.set(step);
    }
  }

  async createModule() {
    if (!this.canCreate() || this.isCreating()) return;

    this.isCreating.set(true);

    try {
      const user = this.currentUser();
      if (!user) {
        throw new Error('Utilisateur non connecté');
      }

      // Create module request
      const moduleRequest = new ModuleRequest(
        this.moduleTitle(),
        'Ma Description', // Empty description for now
        false, // Not a template
        this.moduleType(), // Selected type
        user,
        new Picture(), // Empty picture
        [], // Empty versions - will be created by backend
        [] // Empty accesses
      );

      // Create the module
      const createdModule = await this.moduleHttpService.createModule(moduleRequest);

      // Add to selected folder
      if (this.selectedFolder() && createdModule.versions.length > 0) {
        const selectedFolder = this.selectedFolder();
        let folderId: number;
        
        // Handle both TreeNode object and string key
        if (selectedFolder && typeof selectedFolder === 'object' && selectedFolder.key) {
          folderId = parseInt(selectedFolder.key);
        } else if (selectedFolder && typeof selectedFolder === 'string') {
          folderId = parseInt(selectedFolder);
        } else {
          folderId = 1; // Default folder
        }
        
        if (!isNaN(folderId)) {
          const userSavedModule = new UserSavedModule(
            user.id,
            createdModule.id,
            createdModule.versions[0].id!,
            folderId
          );
          await this.userSavedModuleService.saveModule(userSavedModule);
        }
      }

      // Success message
      this.messageService.add({
        severity: 'success',
        summary: 'Module créé',
        detail: `Le module "${this.moduleTitle()}" a été créé avec succès !`
      });

      // Close modal and navigate
      this.dialogRef.close(createdModule);
      this.router.navigate(['/module', createdModule.id]);

    } catch (error) {
      console.error('Erreur lors de la création du module:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Impossible de créer le module. Veuillez réessayer.'
      });
    } finally {
      this.isCreating.set(false);
    }
  }

  close() {
    this.dialogRef.close();
  }
}
import { Component, inject, input, OnInit, signal } from '@angular/core';
import { PictureHttpService } from '../../services/https/picture-http.service';
import { PictureUsage } from '../../enum/PictureUsage';
import { ButtonModule } from 'primeng/button';
import { Router } from '@angular/router';
import { ModuleService } from '../../services/module.service';
import { ModuleHttpService } from '../../services/https/module-http.service';
import { Module } from '../../classes/Module';
import { ModuleSummary } from '../../classes/ModuleSummary';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { ChipModule } from 'primeng/chip';

@Component({
  selector: 'app-module-viewer',
  imports: [ButtonModule, SkeletonModule, TooltipModule, ChipModule],
  templateUrl: './module-viewer.component.html',
  styleUrl: './module-viewer.component.scss'
})
export class ModuleViewerComponent implements OnInit {
  private httpModule = inject(ModuleHttpService);
  private httpPicture = inject(PictureHttpService);
  private router = inject(Router);
  private moduleService = inject(ModuleService);

  moduleId = input.required<number>();
  moduleData = input<Module | ModuleSummary | null>(null); // Données pré-chargées optionnelles
  loadingDetails = signal<boolean>(false);
  picture = '';
  baseUrlImage = "assets/images/baseImageModule.png";

  currentModule = signal<Module | ModuleSummary | null>(null);

  async ngOnInit() {
    try {
      this.loadingDetails.set(true);
      
      // Utiliser les données pré-chargées si disponibles, sinon charger depuis l'API
      let moduleData = this.moduleData();
      if (!moduleData) {
        moduleData = await this.httpModule.getModuleById(this.moduleId());
      } else if (moduleData instanceof ModuleSummary) {
        // Pour afficher les tags, nous avons besoin du module complet
        // Charger le module complet si nous avons seulement un summary
        try {
          moduleData = await this.httpModule.getModuleById(this.moduleId());
        } catch (error) {
          console.warn('Impossible de charger le module complet, utilisation du summary:', error);
          // Garder le summary si le chargement complet échoue
        }
      }
      
      this.currentModule.set(moduleData);

      if (moduleData?.id) {
        // Pour l'image, utiliser d'abord l'image du module si disponible dans les données summary
        if (moduleData instanceof ModuleSummary && moduleData.picture?.src) {
          this.picture = moduleData.picture.src;
        } else if (moduleData.picture?.src) {
          this.picture = moduleData.picture.src;
        } else {
          // Fallback: charger l'image depuis l'API picture
          try {
            const pictures = await this.httpPicture.getPicturesByUsage(PictureUsage.MODULE, moduleData.id);
            this.picture = pictures[0]?.src ?? '';
          } catch (pictureError) {
            console.warn(`Aucune image trouvée pour le module ${moduleData.id} ou erreur:`, pictureError);
            this.picture = '';
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement du module:', error);
      this.currentModule.set(null);
      this.picture = '';
    } finally {
      this.loadingDetails.set(false);
    }
  }

  loadModule() {
    const id = this.moduleId();
    if (id) {
      this.router.navigate(['/module', id]);
    } else {
      console.error("Tentative de chargement d'un module sans ID.");
    }
  }

  hasFullModuleData(): boolean {
    const module = this.currentModule();
    return module instanceof Module;
  }

  getModuleTags() {
    const module = this.currentModule();
    if (module instanceof Module && module.tags) {
      return module.tags;
    }
    return [];
  }
}

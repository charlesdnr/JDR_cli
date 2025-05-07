import { Component, inject, input, OnInit, signal } from '@angular/core';
import { PictureHttpService } from '../../services/https/picture-http.service';
import { PictureUsage } from '../../enum/PictureUsage';
import { ButtonModule } from 'primeng/button';
import { Router } from '@angular/router';
import { ModuleService } from '../../services/module.service';
import { ModuleHttpService } from '../../services/https/module-http.service';
import { Module } from '../../classes/Module';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip'; // Ajout de l'import

@Component({
  selector: 'app-module-viewer',
  // Ajoute TooltipModule aux imports
  imports: [ButtonModule, SkeletonModule, TooltipModule],
  templateUrl: './module-viewer.component.html',
  styleUrl: './module-viewer.component.scss'
})
export class ModuleViewerComponent implements OnInit {
  private httpModule = inject(ModuleHttpService);
  private httpPicture = inject(PictureHttpService);
  private router = inject(Router);
  private moduleService = inject(ModuleService);

  moduleId = input.required<number>();
  loadingDetails = signal<boolean>(false);
  picture = '';
  baseUrlImage = "assets/images/baseImageModule.png";

  currentModule = signal<Module | null>(null);

  async ngOnInit() {
    try {
      this.loadingDetails.set(true);
      // Charge le module complet
      const moduleData = await this.httpModule.getModuleById(this.moduleId());
      this.currentModule.set(moduleData); // Assigne les données chargées

      if (moduleData?.id) {
        try {
          // Tente de charger l'image associée au module
          const pictures = await this.httpPicture.getPicturesByUsage(PictureUsage.MODULE, moduleData.id);
          this.picture = pictures[0]?.src ?? ''; // Prend la première image ou chaîne vide
        } catch (pictureError) {
          console.warn(`Aucune image trouvée pour le module ${moduleData.id} ou erreur:`, pictureError);
          this.picture = ''; // Assure que picture est vide en cas d'erreur
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement du module:', error);
      this.currentModule.set(null); // Réinitialise en cas d'erreur
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
}

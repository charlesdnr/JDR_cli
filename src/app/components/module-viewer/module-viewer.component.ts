import { Component, inject, input, OnInit, signal } from '@angular/core';
import { UserSavedModuleHttpService } from '../../services/https/user-saved-module-http.service';
import { UserSavedModule } from '../../classes/UserSavedModule';
import { PictureHttpService } from '../../services/https/picture-http.service';
import { PictureUsage } from '../../enum/PictureUsage';
import { ButtonModule } from 'primeng/button';
import { Router } from '@angular/router';
import { ModuleService } from '../../services/module.service';
import { ModuleHttpService } from '../../services/https/module-http.service';
import { Module } from '../../classes/Module';

@Component({
  selector: 'app-module-viewer',
  imports: [ButtonModule],
  templateUrl: './module-viewer.component.html',
  styleUrl: './module-viewer.component.scss'
})
export class ModuleViewerComponent implements OnInit {
  private httpUserSavedModule = inject(UserSavedModuleHttpService);
  private httpModule = inject(ModuleHttpService);
  private httpPicture = inject(PictureHttpService);
  private router = inject(Router);
  private moduleService = inject(ModuleService);

  moduleId = input.required<number>()
  picture = ''
  baseUrlImage = "assets/images/baseImageModule.png"

  currentModule = signal<Module | null>(null)

  async ngOnInit(){
    this.currentModule.set(await this.httpModule.getModuleById(this.moduleId()));
    if(this.currentModule()?.id){
      await this.httpPicture.getPicturesByUsage(PictureUsage.MODULE, this.currentModule()!.id)
    }
  }

  async loadModule(){
    await this.moduleService.updateCurrentModule(this.currentModule());
    this.router.navigate(['/new-project'])
  }
}

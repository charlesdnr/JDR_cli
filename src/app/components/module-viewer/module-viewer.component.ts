import { Component, inject, input, OnInit, signal } from '@angular/core';
import { UserSavedModuleHttpService } from '../../services/https/user-saved-module-http.service';
import { UserSavedModule } from '../../classes/UserSavedModule';
import { PictureHttpService } from '../../services/https/picture-http.service';
import { PictureUsage } from '../../enum/PictureUsage';

@Component({
  selector: 'app-module-viewer',
  imports: [],
  templateUrl: './module-viewer.component.html',
  styleUrl: './module-viewer.component.scss'
})
export class ModuleViewerComponent implements OnInit {
  private httpUserSavedModule = inject(UserSavedModuleHttpService);
  private httpPicture = inject(PictureHttpService);

  moduleId = input.required<number>()
  picture = ''
  baseUrlImage = "assets/images/baseImageModule.png"

  currentModule = signal<UserSavedModule | null>(null)

  async ngOnInit(){
    this.currentModule.set(await this.httpUserSavedModule.get(this.moduleId()));
    if(this.currentModule()?.moduleId){
      await this.httpPicture.getPicturesByUsage(PictureUsage.MODULE, this.currentModule()!.moduleId)
    }
  }
}

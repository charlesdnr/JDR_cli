import { Component, inject, input, model, OnInit, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TranslateModule } from '@ngx-translate/core';
import { GameSystem } from '../../classes/GameSystem';
import { ModuleResponse } from '../../classes/ModuleResponse';
import { UserAvatarChooseComponent } from '../../components/user-avatar-choose/user-avatar-choose.component';
import { DialogService } from 'primeng/dynamicdialog';
import { User } from '../../classes/User';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-project-parameters',
  imports: [
    FormsModule,
    ButtonModule,
    SelectModule,
    InputTextModule,
    TextareaModule,
    TranslateModule,
    UserAvatarChooseComponent,
    TooltipModule
  ],
  templateUrl: './project-parameters.component.html',
  styleUrl: './project-parameters.component.scss'
})
export class ProjectParametersComponent implements OnInit {
  private dialogService = inject(DialogService);

  // Inputs
  currentModule = input.required<ModuleResponse>();
  gameSystems = input.required<GameSystem[]>();
  currentUser = input<User | null>(null);
  loadingSave= input<boolean>(false);

  // Models
  currentGameSystem = model<GameSystem | undefined>(undefined);

  // Outputs
  saveRequested = output<void>();
  generateModuleRequested = output<void>();

  ngOnInit(): void {
    // Si un système de jeu est disponible, le sélectionner par défaut
    if (this.gameSystems().length > 0) {
      this.currentGameSystem.set(this.gameSystems()[0]);
    }
  }

  save(): void {
    this.saveRequested.emit();
  }

  generateCompleteModule(): void {
    this.generateModuleRequested.emit();
  }
}

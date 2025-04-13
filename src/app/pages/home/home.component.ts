import { Component, inject } from '@angular/core';
import { AuthHttpService } from '../../services/https/auth-http.service';
import { UserHttpService } from '../../services/https/user-http.service';
import { ButtonModule } from 'primeng/button';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-home',
  imports: [ButtonModule, TranslateModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  userService = inject(UserHttpService);
}

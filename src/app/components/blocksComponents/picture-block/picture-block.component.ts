import { Component, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { FileUploadModule, FileSelectEvent } from 'primeng/fileupload';
import { ImageModule } from 'primeng/image';
import { TranslateModule } from '@ngx-translate/core';
import { TooltipModule } from 'primeng/tooltip';
import { PictureBlock } from '../../../classes/PictureBlock';
import { Picture } from '../../../classes/Picture';

@Component({
  selector: 'app-picture-block',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    FileUploadModule,
    ImageModule,
    TranslateModule,
    TooltipModule,
  ],
  templateUrl: './picture-block.component.html',
  styleUrl: './picture-block.component.scss',
})
export class PictureBlockComponent {
  pictureBlock = input.required<PictureBlock>();
  isReadOnly = input<boolean>(false);

  uploadingImage = signal(false);
  imagePreview = signal<string>('');

  onFileSelect(event: FileSelectEvent) {
    if (this.isReadOnly()) return;

    const file = event.files[0];
    if (file) {
      // Vérifier le type de fichier
      if (!file.type.startsWith('image/')) {
        console.error("Le fichier sélectionné n'est pas une image");
        return;
      }

      // Vérifier la taille (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        console.error("L'image est trop volumineuse (max 5MB)");
        return;
      }

      this.uploadingImage.set(true);

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;

        // Mettre à jour le bloc avec la nouvelle image
        if (this.pictureBlock().picture) {
          this.pictureBlock().picture.src = result;
          this.pictureBlock().picture.title = file.name;
        } else {
          this.pictureBlock().picture = new Picture(
            file.name,
            result,
            new Date().toISOString(),
            new Date().toISOString()
          );
        }

        this.imagePreview.set(result);
        this.uploadingImage.set(false);
      };

      reader.onerror = () => {
        console.error('Erreur lors de la lecture du fichier');
        this.uploadingImage.set(false);
      };

      reader.readAsDataURL(file);
    }
  }

  removeImage() {
    if (this.isReadOnly()) return;

    if (this.pictureBlock().picture) {
      this.pictureBlock().picture.src = '';
      this.pictureBlock().picture.title = '';
    }
    this.imagePreview.set('');
  }

  onLabelChange(value: string) {
    if (this.isReadOnly()) return;
    this.pictureBlock().label = value;
  }

  hasImage(): boolean {
    return !!this.pictureBlock().picture?.src;
  }

  getImageSrc(): string {
    return this.pictureBlock().picture?.src || '';
  }

  getImageTitle(): string {
    return this.pictureBlock().picture?.title || 'Image';
  }
}

import { Component, inject, input, model, signal } from '@angular/core';
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
import { FileHttpService } from '../../../services/https/file-http.service';

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
  private fileuploadService = inject(FileHttpService);

  pictureBlock = model.required<PictureBlock>();
  isReadOnly = input<boolean>(false);

  uploadingImage = signal(false);
  imagePreview = signal<string>('');

  onFileSelect(event: FileSelectEvent) {
    if (this.isReadOnly()) return;

    const file = event.files[0];
    if (!file) return;

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

    // Upload file to server
    this.fileuploadService.uploadFile(file)
      .then((fileId) => {
        // Update the picture block with the server file ID
        this.pictureBlock.update((b) => {
          if (b.picture) {
            b.picture.src = fileId;
            b.picture.title = file.name;
          } else {
            b.picture = new Picture(
              file.name,
              fileId,
              new Date().toISOString(),
              new Date().toISOString()
            );
          }
          // Update block title if empty
          if (!b.title) {
            b.title = file.name;
          }
          return b;
        });

        // Create preview for display
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          this.imagePreview.set(result);
          this.uploadingImage.set(false);
        };
        reader.readAsDataURL(file);
      })
      .catch((error) => {
        console.error('Erreur lors de l\'upload du fichier:', error);
        this.uploadingImage.set(false);
      });
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
    const src = this.pictureBlock().picture?.src;
    if (!src) return '';
    
    // If we have a preview from FileReader, use it; otherwise use server file ID
    return this.imagePreview() || src;
  }

  getImageTitle(): string {
    return this.pictureBlock().picture?.title || 'Image';
  }
}

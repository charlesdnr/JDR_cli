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
import { trigger, transition, style, animate, keyframes } from '@angular/animations';

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
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('400ms cubic-bezier(0.35, 0, 0.25, 1)', 
               style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('fadeSlideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-20px)' }),
        animate('300ms 100ms cubic-bezier(0.35, 0, 0.25, 1)', 
               style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ]),
    trigger('imageScale', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.8)' }),
        animate('500ms cubic-bezier(0.34, 1.56, 0.64, 1)', 
               style({ opacity: 1, transform: 'scale(1)' }))
      ])
    ]),
    trigger('pulseGlow', [
      transition(':enter', [
        style({ transform: 'scale(0.95)', opacity: 0.8 }),
        animate('600ms ease-in-out', style({ transform: 'scale(1)', opacity: 1 }))
      ])
    ]),
    trigger('spin', [
      transition(':enter', [
        animate('1s ease-in-out', keyframes([
          style({ transform: 'rotate(0deg) scale(0.8)', opacity: 0 }),
          style({ transform: 'rotate(180deg) scale(1.1)', opacity: 0.5 }),
          style({ transform: 'rotate(360deg) scale(1)', opacity: 1 })
        ]))
      ])
    ])
  ]
})
export class PictureBlockComponent {
  private fileuploadService = inject(FileHttpService);

  pictureBlock = model.required<PictureBlock>();
  isReadOnly = input<boolean>(false);

  uploadingImage = signal(false);
  imagePreview = signal<string>('');
  uploadProgress = signal(0);
  isDragging = signal(false);

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

  getImageFormat(): string {
    const src = this.pictureBlock().picture?.src;
    if (!src) return 'N/A';
    
    // Extract format from file extension or content type
    const extension = src.split('.').pop()?.toUpperCase();
    return extension || 'IMG';
  }

  getImageSize(): string {
    // This would need to be calculated from the actual file
    // For now, return a placeholder
    return '2.4 MB';
  }

  getImageDimensions(): string {
    // This would need to be calculated from the actual image
    // For now, return a placeholder
    return '1920×1080';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Simulate FileSelectEvent
      this.onFileSelect({ files: [file] } as FileSelectEvent);
    }
  }
}

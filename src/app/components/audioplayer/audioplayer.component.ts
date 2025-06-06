import { Component, ElementRef, inject, input, model, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { FileSelectEvent, FileUploadModule } from 'primeng/fileupload';
import { SliderChangeEvent, SliderModule } from 'primeng/slider';
import { TableModule } from 'primeng/table';
import { FileHttpService } from '../../services/https/file-http.service';

interface AudioFile {
  name: string;
  url: string;
  duration?: number;
}

@Component({
  selector: 'app-audioplayer',
  imports: [ButtonModule, CardModule, FileUploadModule, SliderModule, TableModule, FormsModule],
  templateUrl: './audioplayer.component.html',
  styleUrl: './audioplayer.component.scss'
})
export class AudioplayerComponent {
  private readonly messageService = inject(MessageService);
  private readonly fileHttpService = inject(FileHttpService);

  // Inputs/Outputs pour la communication avec le parent
  isReadOnly = input<boolean>(false);
  onAudioUploaded = output<string>(); // Émet l'ID du fichier uploadé
  onAudioRemoved = output<void>(); // Émet quand l'audio est supprimé

  // Signals
  audioFiles = signal<AudioFile[]>([]);
  currentAudio = signal<AudioFile | null>(null);
  isPlaying = signal<boolean>(false);
  currentTime = signal<number>(0);
  duration = signal<number>(0);
  volume = signal<number>(100);
  uploadingAudio = signal<boolean>(false);

  // ViewChild with signal
  audioPlayer = viewChild.required<ElementRef<HTMLAudioElement>>('audioPlayer');

  onFileSelect(event: FileSelectEvent) {
    if (this.isReadOnly()) return;

    const file = event.files[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith('audio/')) {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: "Le fichier sélectionné n'est pas un fichier audio"
      });
      return;
    }

    // Vérifier la taille (max 10MB pour audio)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: "Le fichier audio est trop volumineux (max 10MB)"
      });
      return;
    }

    this.uploadingAudio.set(true);

    // Upload file to server
    this.fileHttpService.uploadFile(file)
      .then((fileId) => {
        // Créer un preview local pour l'affichage
        const reader = new FileReader();
        reader.onload = (e) => {
          const audioFile: AudioFile = {
            name: file.name,
            url: e.target?.result as string
          };

          this.audioFiles.update(files => [...files, audioFile]);

          // Jouer automatiquement le premier fichier ajouté
          if (this.audioFiles().length === 1) {
            this.playAudio(audioFile);
          }

          // Émettre l'ID du fichier uploadé vers le parent
          this.onAudioUploaded.emit(fileId);

          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Fichier audio ajouté avec succès'
          });

          this.uploadingAudio.set(false);
        };
        reader.readAsDataURL(file);
      })
      .catch((error) => {
        console.error('Erreur lors de l\'upload du fichier audio:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible d\'uploader le fichier audio'
        });
        this.uploadingAudio.set(false);
      });
  }

  playAudio(audio: AudioFile) {
    this.currentAudio.set(audio);
    this.resetPlayer();
    // setTimeout(() => {
    //   this.audioPlayer().nativeElement.play();
    //   this.isPlaying.set(true);
    // }, 100);
  }

  togglePlay() {
    const audio = this.audioPlayer().nativeElement;
    if (audio.paused) {
      audio.play();
      this.isPlaying.set(true);
    } else {
      audio.pause();
      this.isPlaying.set(false);
    }
  }

  stopAudio() {
    const audio = this.audioPlayer().nativeElement;
    audio.pause();
    audio.currentTime = 0;
    this.isPlaying.set(false);
    this.currentTime.set(0);
  }

  onMetadataLoaded() {
    this.duration.set(this.audioPlayer().nativeElement.duration);
  }

  onTimeUpdate() {
    this.currentTime.set(this.audioPlayer().nativeElement.currentTime);
  }

  onAudioEnded() {
    this.isPlaying.set(false);
    this.currentTime.set(0);
  }

  onSeek(event: SliderChangeEvent) {
    this.audioPlayer().nativeElement.currentTime = event.value ?? 0;
  }

  onVolumeChange(event: SliderChangeEvent) {
    console.log(event)
    this.audioPlayer().nativeElement.volume = (event.value ?? 0) / 100;
  }

  removeAudio(index: number) {
    if (this.isReadOnly()) return;

    const removedAudio = this.audioFiles()[index];
    this.audioFiles.update(files => files.filter((_, i) => i !== index));

    // Si l'audio supprimé est en cours de lecture
    if (this.currentAudio()?.url === removedAudio.url) {
      this.currentAudio.set(null);
      this.resetPlayer();

      // Jouer le premier audio de la playlist si disponible
      if (this.audioFiles().length > 0) {
        this.playAudio(this.audioFiles()[0]);
      }
    }

    // Si c'était le dernier fichier, s'assurer que currentAudio est null
    if (this.audioFiles().length === 0) {
      this.currentAudio.set(null);
      this.resetPlayer();
      
      // Émettre l'événement de suppression vers le parent
      this.onAudioRemoved.emit();
    }

    this.messageService.add({
      severity: 'info',
      summary: 'Information',
      detail: 'Fichier audio supprimé'
    });
  }

  formatTime(time: number): string {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }

  private resetPlayer() {
    this.isPlaying.set(false);
    this.currentTime.set(0);
    this.duration.set(0);
  }
}

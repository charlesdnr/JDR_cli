import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { FileSelectEvent, FileUploadModule } from 'primeng/fileupload';
import { SliderChangeEvent, SliderModule } from 'primeng/slider';
import { TableModule } from 'primeng/table';

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

  // Signals
  audioFiles = signal<AudioFile[]>([]);
  currentAudio = signal<AudioFile | null>(null);
  isPlaying = signal<boolean>(false);
  currentTime = signal<number>(0);
  duration = signal<number>(0);
  volume = signal<number>(100);

  // ViewChild with signal
  audioPlayer = viewChild.required<ElementRef<HTMLAudioElement>>('audioPlayer');

  onFileSelect(event: FileSelectEvent) {
    const file = event.files[0];
    if (file) {
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

        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Fichier audio ajouté avec succès'
        });
      };
      reader.readAsDataURL(file);
    }
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

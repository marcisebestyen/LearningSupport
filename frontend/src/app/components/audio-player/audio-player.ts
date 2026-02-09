import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpRequestService } from '../../services/http-request.service';

@Component({
  selector: 'app-audio-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './audio-player.html',
  styleUrl: './audio-player.scss',
})
export class AudioPlayerComponent implements OnInit {
  private httpService = inject(HttpRequestService);

  audioList = signal<any[]>([]);
  playingDocId = signal<number | null>(null);
  audioBlobUrl = signal<string | null>(null);
  currentTime = signal(0);
  duration = signal(0);
  isPaused = signal(false);

  ngOnInit() {
    this.httpService.loadAudiosRequest()
      .subscribe(
        data => {
          this.audioList.set(data);
        }
      );
  }

  startAudio(id: number) {
    this.currentTime.set(0);
    this.duration.set(0);
    this.isPaused.set(false);
    this.playingDocId.set(id);

    this.httpService.playAudioRequest(id)
      .subscribe({
        next: (blob: Blob) => {
          const url = URL.createObjectURL(blob);
          this.audioBlobUrl.set(url);
        }
      })
  }

  stopAudio() {
    this.playingDocId.set(null);
    this.audioBlobUrl.set(null);
    this.currentTime.set(0);
    this.isPaused.set(false);
  }

  onTimeUpdate(event: any) {
    const audio = event.target as HTMLAudioElement;
    this.currentTime.set(audio.currentTime);
  }

  onLoadedMetadata(event: any) {
    const audio = event.target as HTMLAudioElement;
    this.duration.set(audio.duration);
    this.isPaused.set(audio.paused);
  }

  togglePlay(player: HTMLAudioElement) {
    if (player.paused) {
      player.play();
      this.isPaused.set(false);
    }
    else {
      player.pause();
      this.isPaused.set(true);
    }
  }

  seek(player: HTMLAudioElement, seconds: number) {
    player.currentTime += seconds;
  }

  onSeekInput(event: any, player: HTMLAudioElement) {
    player.currentTime = event.target.value;
  }

  formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
}

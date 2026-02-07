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

  ngOnInit() {
    this.httpService.loadAudiosRequest()
      .subscribe(
        data => {
          this.audioList.set(data);
        }
      );
  }

  getAudioUrl(docId: number) {
    return `http://localhost:8000/audios/${docId}/play`;
  }

  startAudio(id: number) {
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
  }

  togglePlay(player: HTMLAudioElement) {
    if (player.paused) { player.play(); }
    else { player.pause(); }
  }

  seek(player: HTMLAudioElement, seconds: number) {
    player.currentTime += seconds;
  }

  onSeekInput(event: any, player: HTMLAudioElement) {
    player.currentTime = event.target.value;
  }
}

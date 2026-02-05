import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { DragDropDirective } from '../../directives/drag-drop';
import { MarkdownModule } from 'ngx-markdown';
import { AuthService } from '../../services/auth.service';
import { HttpRequestService } from '../../services/http-request.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule, DragDropDirective, MarkdownModule],
  templateUrl: './file-upload.html',
  styleUrl: './file-upload.scss',
})
export class FileUploadComponent {
  fileName = signal<string>('');
  fileSize = signal<string>('');
  uploadStatus = signal<string>('');
  summary = signal<string>('');
  isLoading = signal<boolean>(false);
  history = signal<any[]>([]);

  constructor(private httpService: HttpRequestService, private auth: AuthService, private router: Router) { }

  onFileDropped(file: File) {
    this.handleFile(file);
  }

  handleFile(file: File) {
    this.fileName.set(file.name);
    this.fileSize.set((file.size / 1024).toFixed(2) + ' KB');
    this.uploadFile(file);
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.fileName.set(file.name);
      this.uploadFile(file);
    }
  }

  uploadFile(file: File) {
    this.isLoading.set(true);
    this.uploadStatus.set('Uploading and analyzing...');
    this.summary.set('');

    this.httpService.uploadFileRequest(file)
      .subscribe({
        next: (response) => {
          this.isLoading.set(false);
          this.uploadStatus.set('Done!');
          this.router.navigate(['/history']);
        },
        error: (error) => {
          this.isLoading.set(false);
          this.uploadStatus.set('Error uploading file!');

          if (error.status === 401) {
            alert("Session expired. Please log in again.");
            this.router.navigate(['/login']);
          }

          console.error(error);
        }
      });

  }
}

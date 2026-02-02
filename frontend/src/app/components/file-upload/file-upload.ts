import {Component, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import {DragDropDirective} from '../../directives/drag-drop';
import {MarkdownModule} from 'ngx-markdown';

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

  constructor(private http: HttpClient) {
  }

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

    const formData = new FormData();
    formData.append('file', file);

    this.http.post<any>('http://127.0.0.1:8000/upload/', formData)
      .subscribe({
        next: (response) => {
          this.isLoading.set(false);
          this.uploadStatus.set('Done!');
          this.summary.set(response.summary);
        },
        error: (error) => {
          this.isLoading.set(false);
          this.uploadStatus.set('Error uploading file!');
          console.error(error);
        }
      });
  }
}

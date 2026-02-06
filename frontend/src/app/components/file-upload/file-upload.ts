import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropDirective } from '../../directives/drag-drop';
import { MarkdownModule } from 'ngx-markdown';
import { HttpRequestService } from '../../services/http-request.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule, DragDropDirective, MarkdownModule, FormsModule],
  templateUrl: './file-upload.html',
  styleUrl: './file-upload.scss',
})
export class FileUploadComponent {
  // File state
  selectedFile = signal<File | null>(null);
  fileName = signal<string>('');
  fileSize = signal<string>('');

  // Upload state
  uploadStatus = signal<string>('');
  summary = signal<string>('');
  isLoading = signal<boolean>(false);

  // Category state
  existingCategories = signal<string[]>([]);
  selectedCategory = signal<string>('');
  newCategoryInput = signal<string>('');
  isAddingNewCategory = signal<boolean>(false);

  history = signal<any[]>([]);

  constructor(private httpService: HttpRequestService, private router: Router) { }

  ngOnInit() {
    this.httpService.loadHistoryRequest()
      .subscribe({
        next: (data: any[]) => {
          const cats = [...new Set(data.map(d => d.category).filter(c => !!c))];
          this.existingCategories.set(cats as string[]);
        }
      });
  }

  onFileDropped(file: File) {
    this.prepareFile(file);
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.prepareFile(file);
    }
  }

  prepareFile(file: File) {
    this.selectedFile.set(file);
    this.fileName.set(file.name);
    this.fileSize.set((file.size / 1024).toFixed(2) + ' KB');
    this.uploadStatus.set('Ready to upload');
  }

  toggleNewCategory() {
    this.isAddingNewCategory.update(v => !v);
    this.selectedCategory.set('');
    this.newCategoryInput.set('');
  }

  startUpload() {
    const file = this.selectedFile();
    if (!file) {
      return;
    }

    let finalCategory = this.selectedCategory();
    if (this.isAddingNewCategory()) {
      finalCategory = this.newCategoryInput();
    }

    this.isLoading.set(true);
    this.uploadStatus.set('Uploading...');

    this.httpService.uploadFileRequest(file, finalCategory)
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.uploadStatus.set('Done');
          this.router.navigate(['/history']);
        },
        error: (error) => {
          this.isLoading.set(false);
          this.uploadStatus.set('Error uploading file!');
          console.error(error);
        }
      })
  }
}

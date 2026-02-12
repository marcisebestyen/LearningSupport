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

  studyFocus = signal<string>('');

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
    if (!this.isValidFile(file)) {
      alert('Invalid file type! Please upload only PDF, Word (.docx) or PowerPoint (.pptx) files.');
      return;
    }

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
    this.executeUpload(false);
  }

  executeUpload(force: boolean) {
    const file = this.selectedFile();
    if (!file) { return; }

    let finalCategory = this.selectedCategory();
    if (this.isAddingNewCategory()) {
      finalCategory = this.newCategoryInput();
    }

    const focusTopic = this.studyFocus();

    this.isLoading.set(true);
    this.uploadStatus.set(force ? 'Forcing upload...' : 'Analyzing document...');

    this.httpService.uploadFileRequest(file, finalCategory, focusTopic, force)
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.uploadStatus.set('Done!');
          this.router.navigate(['/history']);
        },
        error: (error) => {
          this.isLoading.set(false);

          if (error.status === 409) {
            this.handleValidationError(error.error.detail);
          } else {
            this.uploadStatus.set('Error uploading file!');
            console.error(error);
          }
        }
      });
  }

  handleValidationError(detailString: string) {
    const cleanMsg = detailString.replace('VALIDATION_FAILED:', '').trim();

    const userWantsToProceed = confirm(
      `⚠️ AI Warning: The content of this document appears to be invalid or "fake".\n\nReason: ${cleanMsg}\n\nDo you want to proceed anyway?`
    );

    if (userWantsToProceed) {
      this.executeUpload(true);
    } else {
      this.uploadStatus.set('Upload cancelled by user.');
    }
  }

  isValidFile(file: File): boolean {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ];

    return allowedTypes.includes(file.type);
  }
}

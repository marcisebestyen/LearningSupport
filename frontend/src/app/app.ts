import {Component} from '@angular/core';
import {FileUploadComponent} from './components/file-upload/file-upload';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FileUploadComponent],
  template: `
    <div class="app-container">

      <nav class="sidebar">
        <div class="brand">
          <h2>🤖 EduAI</h2>
        </div>
        <ul>
          <li class="active">📁 Upload</li>
          <li>📝 Quiz (Coming Soon)</li>
          <li>📊 Stats (Coming Soon)</li>
        </ul>
      </nav>

      <main class="content">
        <header>
          <h1>Tanulást Segítő Rendszer</h1>
        </header>

        <div class="page-container">
          <app-file-upload></app-file-upload>
        </div>
      </main>

    </div>
  `,
  styles: [`
    :host { display: block; height: 100vh; margin: 0; }

    .app-container {
      display: flex;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
    }

    .sidebar {
      width: 260px;
      background: #1a252f;
      color: #ecf0f1;
      display: flex;
      flex-direction: column;
      padding: 1.5rem;
      flex-shrink: 0;
    }

    .brand h2 {
      margin-top: 0;
      margin-bottom: 2rem;
      color: #3498db;
      text-align: center;
      font-size: 1.8rem;
    }

    .sidebar ul { list-style: none; padding: 0; }
    .sidebar li {
      padding: 15px;
      cursor: pointer;
      border-radius: 8px;
      margin-bottom: 8px;
      font-size: 1.1rem;
      transition: all 0.3s;
    }
    .sidebar li:hover { background: #34495e; transform: translateX(5px); }
    .sidebar li.active { background: #3498db; color: white; font-weight: bold; }

    .content {
      flex: 1;
      background: #f4f7f6;
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    header {
      background: white;
      padding: 1.5rem;
      box-shadow: 0 2px 5px rgba(0,0,0,0.05);
      display: flex;
      justify-content: center;
      align-items: center;
    }

    header h1 {
      margin: 0;
      color: #2c3e50;
      font-size: 1.8rem;
      letter-spacing: 0.5px;
    }

    .page-container {
      padding: 2rem;
      overflow-y: auto; /* Scroll only inside the page, not the sidebar */
      flex: 1;
    }
  `]
})
export class App { }

import { Component, signal, inject, OnInit, ElementRef, ViewChild, AfterViewInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpRequestService } from '../../services/http-request.service';
import mermaid from 'mermaid';

@Component({
  selector: 'app-mindmap-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mindmap-player.html',
  styleUrl: './mindmap-player.scss',
})
export class MindmapPlayerComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private httpService = inject(HttpRequestService);

  mermaidScript = signal<string>('');
  isLoading = signal(true);

  @ViewChild('mermaidDiv') mermaidDiv!: ElementRef;

  constructor() {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
      fontFamily: 'Segoe UI, sans-serif'
    });
  }

  ngOnInit() {
    const mapId = this.route.snapshot.paramMap.get('id');
    if (mapId) {
      this.loadMap(mapId);
    }
  }

  loadMap(id: string) {
    this.httpService.getMindMapRequest(id)
      .subscribe({
        next: (data) => {
          this.mermaidScript.set(data.mermaid_script);
          this.isLoading.set(false);
          setTimeout(() => this.renderMermaid(), 100);
        },
        error: (error) => {
          console.error("Error loading mind map.", error);
          this.isLoading.set(false);
        }
      });
  }

  async renderMermaid() {
    if (this.mermaidDiv && this.mermaidScript()) {
      try {
        const element = this.mermaidDiv.nativeElement;
        element.innerHTML = '';

        // if(!this.mermaidScript().startsWith('graph') && !this.mermaidScript().startsWith('mindmap')) {
        //   console.warn("Script didn't start with graph/mindmap, appending graph TD");
        //   this.mermaidScript.update(s => `graph TD\n${s}`);
        // }

        const { svg } = await mermaid.render('mermaid-svg-' + Date.now(), this.mermaidScript());
        element.innerHTML = svg;
      } catch (error) {
        console.error('Mermaid rendering failed', error);
        this.mermaidDiv.nativeElement.innerHTML =
          `<div style="color: #ef5350; text-align:center; padding: 2rem;">
                <h3>Diagram Syntax Error</h3>
                <p>Please regenerate this mind map.</p>
             </div>`;
      }
    }
  }

  exit() {
    this.router.navigate(['/mindmaps']);
  }
}

// home.component.ts

import {
  Component,
  ElementRef,
  AfterViewInit,
  ViewChild,
  inject,
} from '@angular/core';
import cytoscape, { ElementDefinition } from 'cytoscape';
import { FamilyService } from '../../core/services/family.service';
import { FamilyMember } from '../../shared/models/family-member.model';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements AfterViewInit {
  @ViewChild('cy', { static: true }) cyRef!: ElementRef<HTMLElement>;
  private familyService = inject(FamilyService);
  cy?: cytoscape.Core;

  ngAfterViewInit(): void {
    this.familyService.getMyFamily().subscribe((members) => {
      this.renderGraph(members);
    });
  }

  zoomIn(): void {
    if (this.cy) {
      const newZoom = this.cy.zoom() * 1.2;
      this.cy.zoom({ level: newZoom, renderedPosition: { x: 0, y: 0 } });
      this.cy.center();
    }
  }

  zoomOut(): void {
    if (this.cy) {
      const newZoom = this.cy.zoom() / 1.2;
      this.cy.zoom({ level: newZoom, renderedPosition: { x: 0, y: 0 } });
      this.cy.center();
    }
  }

  private renderGraph(members: FamilyMember[]) {
    // 1) Group into generations
    const grandMaternal = members.filter(
      (m) =>
        m.role === 'maternal_grandmother' || m.role === 'maternal_grandfather'
    );
    const grandPaternal = members.filter(
      (m) =>
        m.role === 'paternal_grandmother' || m.role === 'paternal_grandfather'
    );
    const parents = members.filter(
      (m) => m.role === 'mother' || m.role === 'father'
    );
    const ownerArr = members.filter((m) => m.role === 'owner');

    // 2) Compute parent & owner positions evenly
    const container = this.cyRef.nativeElement;
    const W = container.clientWidth;
    const H = container.clientHeight;
    const tierYs = {
      grandparents: H * 0.2,
      parents: H * 0.4,
      owner: H * 0.55,
    };

    const computeEven = (arr: any[], y: number) =>
      arr.map((m, i) => ({
        role: m.role,
        x: ((i + 1) * W * 0.4) / (arr.length + 1) + W * 0.2,
        y,
      }));

    const parentPosArr = computeEven(parents, tierYs.parents);
    

    // 3) Compute grandparents positions around their parent
    // find mother/father x
    const posMap = new Map<string, { x: number; y: number }>();
    parentPosArr.forEach((p) => posMap.set(p.role, { x: p.x, y: p.y }));

    const motherX = posMap.get('mother')?.x ?? W * 0.33;
    const fatherX = posMap.get('father')?.x ?? W * 0.66;
    const offset = Math.min(60, Math.abs(fatherX - motherX) / 2);
    const ownerX = (motherX + fatherX) / 2;
const ownerPosArr = ownerArr.map((m) => ({
  role: m.role,
  x: ownerX,
  y: tierYs.owner,
}));

    const grandMatPos = grandMaternal.map((g, i) => ({
      role: g.role,
      x: motherX + (i === 0 ? -offset : offset),
      y: tierYs.grandparents,
    }));
    const grandPatPos = grandPaternal.map((g, i) => ({
      role: g.role,
      x: fatherX + (i === 0 ? -offset : offset),
      y: tierYs.grandparents,
    }));

    // 4) Merge all positions
    [...parentPosArr, ...ownerPosArr, ...grandMatPos, ...grandPatPos].forEach(
      (p) => posMap.set(p.role, { x: p.x, y: p.y })
    );

    // 5) Build Cytoscape elements
    const elements: ElementDefinition[] = [];

    // nodes
    members.forEach((m) => {
      const pos = posMap.get(m.role)!;
      elements.push({
        data: {
          id: m.role,
          label: `${m.firstName} ${m.lastName}\n${new Date(
            m.dob
          ).getFullYear()}`,
          gender: m.gender?.toLowerCase(),
          photo: m.photoUrl
            ? `${environment.apiUrl}${m.photoUrl}`
            : 'assets/user.svg',
        },
        position: { x: pos.x, y: pos.y },
      });
    });

    // edges
    const addEdge = (s: string, t: string, opts = {}) => {
      if (posMap.has(s) && posMap.has(t)) {
        elements.push({ data: { source: s, target: t, ...opts } });
      }
    };

    // maternal grandparents → mother
    addEdge('maternal_grandmother', 'mother');
    addEdge('maternal_grandfather', 'mother');

    // paternal grandparents → father
    addEdge('paternal_grandmother', 'father');
    addEdge('paternal_grandfather', 'father');

    // mother ↔ father (continuous)
    addEdge('mother', 'father');

    // parents → owner
    addEdge('mother', 'owner');
    addEdge('father', 'owner');
    // 6) Render with preset layout
    this.cy = cytoscape({
      container: this.cyRef.nativeElement,
      elements,
      layout: {
        name: 'preset',
        fit: true,
        padding: 20,
      },
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            'text-wrap': 'wrap',
            'text-max-width': '100px',
            'text-valign': 'bottom',
            'text-halign': 'center',
            'font-size': '13px',
            'background-image': 'data(photo)',
            'background-fit': 'cover',
            'background-opacity': 0.9,
            width: '60px',
            height: '60px',
            shape: 'ellipse',
            color: '#fff',
            'text-outline-color': '#000',
            'text-outline-width': 2,
            'border-width': 2,
            'border-color': '#888',
          },
        },
        {
          selector: 'node[gender="male"]',
          style: { 'border-color': '#51a7f9' },
        },
        {
          selector: 'node[gender="female"]',
          style: { 'border-color': '#f772b0' },
        },
        { selector: 'node[id="owner"]', style: { 'border-color': '#007bff' } },
        {
          selector: 'edge',
          style: {
            width: 2,
            'line-color': '#ccc',
            'target-arrow-shape': 'triangle',
          },
        },
      ],
    });
    this.cy.zoom(0.9);
    this.cy.center();
  }

  private getNodeSize(): number {
    const width = window.innerWidth;
    if (width < 600) return 60; // Mobile
    if (width < 1024) return 90; // Tablet
    return 110; // Desktop
  }
}

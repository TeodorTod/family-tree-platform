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
  // ───────────────────────────────────────────────────────────────
  // 1) Split into generations
  // ───────────────────────────────────────────────────────────────
  const maternalGP = members.filter(m =>
    m.role === 'maternal_grandmother' || m.role === 'maternal_grandfather'
  );
  const paternalGP = members.filter(m =>
    m.role === 'paternal_grandmother' || m.role === 'paternal_grandfather'
  );
  const parents = members.filter(m =>
    m.role === 'mother' || m.role === 'father'
  );
  const ownerArr = members.filter(m => m.role === 'owner');

  // ───────────────────────────────────────────────────────────────
  // 2) Measure container + detect mobile
  // ───────────────────────────────────────────────────────────────
  const container = this.cyRef.nativeElement;
  const W = container.clientWidth;
  const H = container.clientHeight;
  const isMobile = W < 1400;

  // ───────────────────────────────────────────────────────────────
  // 3) Vertical tiers: keep desktop as you had, squash for mobile
  // ───────────────────────────────────────────────────────────────
 const tierYs = {
  grandparents: H * 0.10,       // up a little
  parents:      isMobile 
                   ? H * 0.22  // really pull up on mobile
                   : H * 0.28, // tighter on desktop as well
  owner:        isMobile 
                   ? H * 0.32  // bring owner closer to parents
                   : H * 0.46, // same on desktop
};
  // ───────────────────────────────────────────────────────────────
  // 4) Two different “even‐spread” functions:
  //    - desktop spreads into 40% of canvas (centered)
  //    - mobile spans the full width
  // ───────────────────────────────────────────────────────────────
  const spreadDesktop = (arr: any[], y: number) =>
    arr.map((m, i) => ({
      role: m.role,
      x: ((i + 1) * (W * 0.4)) / (arr.length + 1) + (W * 0.3),
      y,
    }));

  const spreadMobile = (arr: any[], y: number) =>
    arr.map((m, i) => ({
      role: m.role,
      x: ((i + 1) * W) / (arr.length + 1),
      y,
    }));

  // pick the right one
  const parentPosArr = isMobile
    ? spreadMobile(parents, tierYs.parents)
    : spreadDesktop(parents, tierYs.parents);

  // ───────────────────────────────────────────────────────────────
  // 5) Owner always in exact center between mum & dad
  // ───────────────────────────────────────────────────────────────
  const motherX = parentPosArr.find(p => p.role === 'mother')!.x;
  const fatherX = parentPosArr.find(p => p.role === 'father')!.x;
  const ownerPosArr = ownerArr.map(m => ({
    role: m.role,
    x: (motherX + fatherX) / 2,
    y: tierYs.owner,
  }));

  // ───────────────────────────────────────────────────────────────
  // 6) Grandparents offset around their child
  // ───────────────────────────────────────────────────────────────
  const gpOffset = isMobile
    ? W * 0.08           // 8% of width on mobile
    : Math.min(60, Math.abs(fatherX - motherX) / 2);

  const grandMatPos = maternalGP.map((g, i) => ({
    role: g.role,
    x: motherX + (i === 0 ? -gpOffset : gpOffset),
    y: tierYs.grandparents,
  }));
  const grandPatPos = paternalGP.map((g, i) => ({
    role: g.role,
    x: fatherX + (i === 0 ? -gpOffset : gpOffset),
    y: tierYs.grandparents,
  }));

  // ───────────────────────────────────────────────────────────────
  // 7) Build a role→position map
  // ───────────────────────────────────────────────────────────────
  const posMap = new Map<string,{x:number,y:number}>();
  parentPosArr.forEach(p => posMap.set(p.role,   { x:p.x, y:p.y }));
  ownerPosArr .forEach(p => posMap.set(p.role,   { x:p.x, y:p.y }));
  grandMatPos .forEach(p => posMap.set(p.role,   { x:p.x, y:p.y }));
  grandPatPos .forEach(p => posMap.set(p.role,   { x:p.x, y:p.y }));

  // ───────────────────────────────────────────────────────────────
  // 8) Build Cytoscape elements
  // ───────────────────────────────────────────────────────────────
  const elements: ElementDefinition[] = [];

  // 8a) Nodes
  members.forEach(m => {
    const { x, y } = posMap.get(m.role)!;
    elements.push({
      data: {
        id:    m.role,
        label: `${m.firstName} ${m.lastName}\n${new Date(m.dob).getFullYear()}`,
        gender:m.gender?.toLowerCase(),
        photo: m.photoUrl ? `${environment.apiUrl}${m.photoUrl}` : 'assets/user.svg',
      },
      position: { x, y }
    });
  });

  // 8b) Edges
  const connect = (s:string,t:string) => {
    if (posMap.has(s) && posMap.has(t)) {
      elements.push({ data:{ source:s, target:t } });
    }
  };
  connect('maternal_grandmother','mother');
  connect('maternal_grandfather','mother');
  connect('paternal_grandmother','father');
  connect('paternal_grandfather','father');
  connect('mother','father');
  connect('mother','owner');
  connect('father','owner');

  // ───────────────────────────────────────────────────────────────
  // 9) Render Cytoscape exactly as before on desktop,
  //    but with the new positions and slightly tweaked zoom & node‐sizes on mobile
  // ───────────────────────────────────────────────────────────────
  this.cy = cytoscape({
    container,
    elements,
    layout: { name:'preset', fit:true, padding:20 },
    style: [
      {
        selector:'node',
        style:{
          label:            'data(label)',
          'text-wrap':      'wrap',
          'text-max-width': '80px',
          'text-valign':    'bottom',
          'text-halign':    'center',
          'font-size':      isMobile ? '12px' : '13px',
          'background-image':'data(photo)',
          'background-fit':  'cover',
          'background-opacity':0.9,
          width:            isMobile ? '60px' : '60px',
          height:           isMobile ? '60px' : '60px',
          shape:            'ellipse',
          color:            '#fff',
          'text-outline-color':'#000',
          'text-outline-width':2,
          'border-width':   2,
          'border-color':   '#888'
        }
      },
      { selector:'node[gender="male"]',   style:{ 'border-color':'#51a7f9' } },
      { selector:'node[gender="female"]', style:{ 'border-color':'#f772b0' } },
      { selector:'node[id="owner"]',      style:{ 'border-color':'#007bff' } },
      {
        selector:'edge',
           style: {
          width:            2,
          'line-color':     '#ccc',
          'curve-style':    'straight',  
          'target-arrow-shape': 'none'    
        }
      }
    ]
  });

  // final zoom & center
  this.cy.zoom(isMobile ? 0.7 : 0.9);
  this.cy.center();

  const shiftY = container.clientHeight * 0.2;
  this.cy.panBy({ x: 0, y: shiftY });
}


}

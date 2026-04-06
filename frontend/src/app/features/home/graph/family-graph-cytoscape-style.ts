import { StylesheetJson } from 'cytoscape';

export function getFamilyGraphStylesheet(options: {
  circleSize: number;
  textSize: number;
  labelMaxWidth: number;
}): StylesheetJson {
  const { circleSize, textSize, labelMaxWidth } = options;
  return [
    {
      selector: 'node',
      style: {
        label: 'data(label)',
        'text-wrap': 'wrap',
        'text-max-width': `${labelMaxWidth}px`,
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-margin-y': 4,
        'line-height': 1.2,
        'font-size': `${textSize}px`,
        'font-family': 'Inter, system-ui, sans-serif',
        'background-image': 'data(photo)',
        'background-fit': 'cover',
        width: `${circleSize}px`,
        height: `${circleSize}px`,
        shape: 'ellipse',
        color: '#fff',
        'text-outline-color': '#000',
        'text-outline-width': 2,
        'border-width': 2,
        'border-color': '#94a3b8',
      },
    },
    {
      selector: 'node.graph-lineage',
      style: {
        'border-color': '#cbd5e1',
        'border-width': 3,
      },
    },
    {
      selector: 'node.graph-child',
      style: {
        'border-color': '#7dd3fc',
        'border-width': 3,
      },
    },
    {
      selector: 'node.graph-sibling',
      style: {
        'border-color': '#c4b5fd',
        'border-width': 3,
      },
    },
    {
      selector: 'node.graph-partner',
      style: {
        'border-color': '#fbbf24',
        'border-width': 3,
      },
    },
    {
      selector: 'node.graph-extended',
      style: {
        'border-color': '#64748b',
        'border-width': 2,
      },
    },
    {
      selector: 'node[id = "owner"]',
      style: {
        'border-color': '#2d4c2f',
        'border-width': 6,
        'background-color': '#fff',
        'font-weight': 'bold',
        'text-outline-color': '#2d4c2f',
        'text-outline-width': 3,
      },
    },
    {
      selector: 'edge[relationship = "partner"]',
      style: {
        width: 3,
        'line-color': '#fbbf24',
        'line-style': 'dashed',
        'curve-style': 'bezier',
        opacity: 0.95,
        'target-arrow-shape': 'none',
      },
    },
    {
      selector: 'edge[relationship = "sibling"]',
      style: {
        width: 2.5,
        'line-color': '#a78bfa',
        'curve-style': 'bezier',
        opacity: 0.95,
        'target-arrow-shape': 'none',
      },
    },
    {
      selector: 'edge[relationship = "parent"]',
      style: {
        width: 3.5,
        'line-color': '#f1f5f9',
        'curve-style': 'bezier',
        opacity: 0.98,
        'target-arrow-shape': 'none',
      },
    },
    {
      selector: 'edge',
      style: {
        width: 3,
        'line-color': '#e2e8f0',
        'curve-style': 'bezier',
        opacity: 0.92,
        'target-arrow-shape': 'none',
      },
    },
  ];
}

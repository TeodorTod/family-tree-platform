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
      selector: 'edge',
      style: {
        width: 2,
        'line-color': '#666',
        'curve-style': 'straight',
        'target-arrow-shape': 'none',
      },
    },
  ];
}

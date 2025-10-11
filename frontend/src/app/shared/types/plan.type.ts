export type Plan = {
  code: '6m' | '1y' | '2y';
  titleKey: string;
  total: number; 
  days: number; 
  highlight?: boolean;
};

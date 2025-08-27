export interface UnsavedAware {
  hasUnsavedChanges(): boolean;
  markSaved?(): void;
}

import { UnsavedAware } from "../interfaces/unsaved-aware";

export type TabRef<T, V = any> = T &
  Partial<UnsavedAware> & {
    getValue?: () => V;
    markSaved?: () => void;
  };
// src/types/splitpanes.d.ts
declare module 'splitpanes' {
  import { DefineComponent } from 'vue';

  export const Pane: DefineComponent<object, object, any>;
  export const Splitpanes: DefineComponent<{
    gutterSize?: number;
    horizontal?: boolean;
    maxSize?: number;
    minSize?: number;
    pushOtherPanes?: boolean;
    size?: number;
    snapOffset?: number;
  }, object, any>;
}

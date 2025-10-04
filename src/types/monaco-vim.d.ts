declare module "monaco-vim" {
  import type { editor } from "monaco-editor";

  export interface VimMode {
    dispose: () => void;
  }

  export function initVimMode(
    editor: editor.IStandaloneCodeEditor,
    statusContainer?: HTMLElement,
    options?: any,
  ): VimMode;
}

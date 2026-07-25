/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TASK_PROPOSAL_URL?: string;
  readonly VITE_CONTRIBUTING_GUIDE_URL?: string;
  readonly VITE_TASK_TEMPLATE_URL?: string;
  readonly VITE_EXAMPLE_TASK_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

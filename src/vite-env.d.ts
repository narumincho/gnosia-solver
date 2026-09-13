/// <reference types="vite/client" />

type ImportMetaEnv = {
  readonly VITE_COMMIT_HASH?: string;
};

type ImportMeta = {
  readonly env: ImportMetaEnv;
};

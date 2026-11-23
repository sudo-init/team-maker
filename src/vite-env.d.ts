/// <reference types="vite/client" />

/** 빌드한 커밋의 짧은 해시. vite.config.ts의 define이 채운다. */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** 피드백을 받을 수신 서버 주소. 비어 있으면 GitHub 이슈로 받는다. */
  readonly VITE_FEEDBACK_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

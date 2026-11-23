/** 빌드할 때 정해지는 값. 화면 코드는 import.meta.env 대신 여기서 읽는다. */

export const APP_VERSION = __APP_VERSION__;

/** 피드백 이슈를 남길 저장소. */
export const REPO_URL = 'https://github.com/sudo-init/team-maker';

/** 피드백 수신 서버 주소. 비어 있으면 GitHub 이슈로 받는다. */
export const FEEDBACK_ENDPOINT = (import.meta.env.VITE_FEEDBACK_ENDPOINT ?? '').trim();

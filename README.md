# Team Maker

모임·스터디·게임 내전에서 쓰는 팀 나누기 웹앱입니다. 서버 없이 브라우저에서만 동작하고, 입력한 명단과 설정은 브라우저(localStorage)에 저장됩니다.

## 기능

### 랜덤 팀 짜기 (`/random`)
- 이름을 쉼표나 줄바꿈으로 한 번에 여러 명 추가. 단톡방 명단을 그대로 붙여넣어도 한 명씩 들어감. 중복 이름은 자동으로 건너뜀
- 팀 개수 2개 이상, 팀 간 인원 차이는 최대 1명
- **조건**: 꼭 갈라야 하는 사람(다른 팀), 붙여야 하는 사람(같은 팀), 특정 팀 고정. "철수와 영희는 다른 팀"처럼 문장으로 입력
  - 조건끼리 모순이면 팀을 만들지 않고 이유를 문장으로 알려줌
- **실력 균형 맞추기**: 참가자마다 점수를 매기면 팀별 평균 점수가 최대한 비슷해지도록 나눔
  - 조건을 지키는 범위 안에서 균형을 맞춤. 점수가 없는 사람은 평균 점수로 계산
- **결과 복사·공유**: 메신저에 붙여넣기 좋은 글로 복사. 휴대폰에서는 공유 시트로 바로 보내기

### 포지션별 팀 나누기 (`/`)
- 포지션(TOP·JUNGLE·MID·ADC·SUPPORT)마다 두 명을 입력하면 한 명씩 A팀·B팀으로 나눔
- 빈칸·중복 입력 검사, 결과 복사·공유, 최근 50개 기록 보관

### 공통
- **피드백 보내기**: 헤더의 피드백 버튼. 아래 "피드백 받기" 참고
- 라이트/다크/시스템 설정 화면 모드
- 모바일 화면 대응(주 버튼 하단 고정), 동작 줄이기 설정 존중

## 개발

```bash
npm install
npm run dev      # 개발 서버
npm test         # 단위 테스트 (vitest)
npm run lint     # ESLint
npm run build    # 타입 검사 + 프로덕션 빌드 (dist/)
```

Node.js 20 이상이 필요합니다(CI는 22 사용).

## 구조

```
src/
  lib/                 화면과 무관한 순수 로직 — 테스트는 여기에 모여 있음
    team.ts            조건을 지키는 무작위 팀 편성 (union-find + 백트래킹)
    balance.ts         점수 기반 균형 편성 (후보 샘플링 + 맞바꾸기 개선)
    constraints.ts     조건 타입·추가/교체/삭제·저장값 검증
    roster.ts          랜덤 팀 화면의 입력 상태(명단·팀 수·조건·점수)와 저장/복원
    positions.ts       포지션별 팀 나누기와 기록 검증
    storage.ts         localStorage 안전 읽기/쓰기 (깨진 값·차단 환경 방어)
    share.ts           결과를 공유용 글로 변환
    feedback.ts        피드백 전송 내용·검증·GitHub 이슈 주소·수신 서버 전송
    text.ts            조사(와/과, 은/는) 고르기, "4명씩 2팀" 같은 문구
    config.ts          빌드 때 정해지는 값(앱 버전, 피드백 수신 주소)
    theme.ts           화면 모드
  components/          공용 UI (TeamCard, StepSection, ActionBar, Segmented, FeedbackDialog, shadcn/ui …)
  pages/
    RandomTeams.tsx    랜덤 팀 화면 (하위 컴포넌트는 pages/random/)
    TeamDivider.tsx    포지션별 팀 화면
```

설계 원칙:
- **입력 상태는 `roster.ts`의 함수로만 바꾼다.** 모든 함수가 정리된 상태(사라진 사람의 조건·점수 제거, 팀 수 범위 보정)를 돌려준다.
- **결과는 그것을 만든 입력에 묶는다.** 입력이 바뀌면 옛 결과·오류 메시지는 자동으로 보이지 않는다.
- **저장소에서 읽은 값은 항상 검증한다.** 일부가 깨져 있으면 성한 부분만 살린다.

## 피드백 받기

서버 없이 동작하도록 두 가지 방식을 지원합니다. 어느 쪽이든 명단·점수 같은 입력 데이터는 보내지 않습니다.

| 빌드 설정 | 동작 |
|---|---|
| 기본 (설정 없음) | 내용이 채워진 GitHub 이슈 작성 화면을 엽니다 (`.github/ISSUE_TEMPLATE/feedback.yml`, `feedback` 라벨) |
| `VITE_FEEDBACK_ENDPOINT` 지정 | 그 주소로 JSON을 POST합니다. 실패하면 GitHub로 남기는 길을 함께 보여줍니다 |

배포 빌드에 수신 주소를 넣으려면 저장소 Settings → Secrets and variables → Actions → **Variables**에 `FEEDBACK_ENDPOINT`를 등록합니다. 수신 서버가 받는 JSON 모양은 `src/lib/feedback.ts`의 `FeedbackPayload`입니다. 수신 서버는 허용 출처(CORS), 전송 횟수 제한, 스팸 방지를 직접 갖춰야 합니다.

## 배포

`main` 브랜치에 push하면 GitHub Actions가 lint → test → build를 거쳐 GitHub Pages(`/team-maker/`)에 배포합니다. 하위 경로로 바로 접속해도 열리도록 `404.html`을 `index.html`과 같게 둡니다.

# Team Maker

모임·스터디·게임 내전에서 쓰는 팀 나누기 웹앱입니다. 서버 없이 브라우저에서만 동작하고, 입력한 명단과 설정은 브라우저(localStorage)에 저장됩니다.

## 기능

### 랜덤 팀 짜기 (`/random`)
- 이름을 쉼표나 줄바꿈으로 한 번에 여러 명 추가. 중복 이름은 자동으로 건너뜀
- 팀 개수 2개 이상, 팀 간 인원 차이는 최대 1명
- **조건**: 꼭 갈라야 하는 사람(다른 팀), 붙여야 하는 사람(같은 팀), 특정 팀 고정
  - 조건끼리 모순이면 팀을 만들지 않고 이유를 문장으로 알려줌
- **실력 균형 맞추기**: 참가자마다 점수를 매기면 팀별 평균 점수가 최대한 비슷해지도록 나눔
  - 조건을 지키는 범위 안에서 균형을 맞춤. 점수가 없는 사람은 평균 점수로 계산
- **결과 복사**: 메신저에 붙여넣기 좋은 글로 복사

### 포지션별 팀 나누기 (`/`)
- 포지션(TOP·JUNGLE·MID·ADC·SUPPORT)마다 두 명을 입력하면 한 명씩 A팀·B팀으로 나눔
- 빈칸·중복 입력 검사, 결과 복사, 최근 50개 기록 보관

### 공통
- 라이트/다크/시스템 설정 화면 모드
- 모바일 화면 대응

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
    theme.ts           화면 모드
  components/          공용 UI (TeamCard, CopyButton, ThemeToggle, shadcn/ui)
  pages/
    RandomTeams.tsx    랜덤 팀 화면 (하위 컴포넌트는 pages/random/)
    TeamDivider.tsx    포지션별 팀 화면
```

설계 원칙:
- **입력 상태는 `roster.ts`의 함수로만 바꾼다.** 모든 함수가 정리된 상태(사라진 사람의 조건·점수 제거, 팀 수 범위 보정)를 돌려준다.
- **결과는 그것을 만든 입력에 묶는다.** 입력이 바뀌면 옛 결과·오류 메시지는 자동으로 보이지 않는다.
- **저장소에서 읽은 값은 항상 검증한다.** 일부가 깨져 있으면 성한 부분만 살린다.

## 배포

`main` 브랜치에 push하면 GitHub Actions가 lint → test → build를 거쳐 GitHub Pages(`/team-maker/`)에 배포합니다. 하위 경로로 바로 접속해도 열리도록 `404.html`을 `index.html`과 같게 둡니다.

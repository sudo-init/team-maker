# Competitive Analysis Report

> Generated: 2026-11-20
> Focus: Full service (랜덤 팀 나누기 / 팀 밸런싱 도구)

## 1. Service Overview

Team Maker는 이름 목록을 입력하면 N개 팀으로 랜덤 편성해 주는 정적 웹앱(React 19 + Vite, GitHub Pages 배포)이다. 회원가입·서버 없이 브라우저 localStorage만 쓰며, "같은 팀 / 다른 팀 / 팀 고정" 조건을 백트래킹으로 모두 지키면서 인원 차이를 최대 1명으로 맞춘다. 별도로 리그 오브 레전드 5포지션 × 2팀 고정 형식의 "포지션별 팀 나누기" 화면이 있다.

**핵심 가치 제안**
- 설치·가입 없이 바로 쓰는 무료 웹 도구
- 조건이 서로 모순일 때 "왜 안 되는지"를 문장으로 알려주는 제약 엔진 (경쟁 도구 대부분은 조용히 무시하거나 충돌만 표시)
- 데이터가 기기 밖으로 나가지 않음

### 현재 기능 인벤토리 (코드 기준)

| 분류 | 기능 | 성숙도 | 근거 |
|---|---|---|---|
| 편성 | N팀 랜덤 분배, 인원 차 ≤ 1 | Advanced | `src/lib/team.ts` |
| 편성 | 같은 팀 / 다른 팀 / 팀 고정 조건 + 모순 사유 안내 | Advanced | `src/lib/team.ts`, `src/lib/constraints.ts` |
| 편성 | LoL 포지션별 2팀 나누기 (포지션당 2명 동전 던지기) | MVP | `src/pages/TeamDivider.tsx` |
| 입력 | 쉼표/줄바꿈 일괄 입력, 중복 이름 차단, IME Enter 처리 | Basic | `parseNames`, `RandomTeams.tsx` |
| 저장 | 참가자·조건·팀 수 localStorage 저장 (1세트) | Basic | `RandomTeams.tsx` |
| 기록 | 포지션 모드 결과 최근 50건 기록 (재사용·개별 삭제 불가) | MVP | `TeamDivider.tsx` |
| 기록 | 랜덤 모드 결과 기록 | 없음 | — |
| 공유 | 결과 복사 / 이미지 / 링크 | 없음 | — |
| 밸런싱 | 실력·성별·태그 기반 균형 | 없음 | — |
| UX | 다크 모드 (토큰만 정의, 토글 없음), 반응형 (부분) | MVP | `src/index.css`, 레이아웃 클래스 |

## 2. Feature Comparison

조사 대상
- **직접 경쟁**: devcomma 랜덤 조 편성(웹, KR), Picker Wheel Team Generator(웹, 글로벌), Keamk(웹, 글로벌), Team Shake(iOS 유료), Teamru(iOS, KR)
- **간접 경쟁**: LoL 내전 도구(LoL Custom Drafter, NCG Squad Builder, Kletoi), Discord 내전 봇(League Helper Bot, inhousebot 등)
- **대체재**: 사다리타기·제비뽑기 웹/앱, 카카오톡·디스코드 내 랜덤 기능, 손으로 뽑기

| 기능 | Team Maker | devcomma | Picker Wheel | Keamk | Team Shake | Teamru | LoL 내전 도구/봇 |
|---|---|---|---|---|---|---|---|
| 랜덤 N팀 분배 (인원 차 ≤1) | ✅ | ✅ | ✅ | ✅ | ✅ (1–64팀) | ✅ (≤100팀) | ⚠️ 5v5 고정 |
| 조당 인원 기준 편성 | ❌ | ✅ | ✅ | 미확인 | 미확인 | 미확인 | ❌ |
| 같은 팀 / 다른 팀 조건 | ✅ | ✅ | 미확인 | 미확인 | 미확인 | ❌ | ❌ |
| 특정 팀 고정 | ✅ | ✅ | 미확인 | 미확인 | 미확인 | ❌ | ⚠️ 역할 고정 |
| 모순 조건 사유 안내 | ✅ | ⚠️ 충돌 조합 표시 | ❌ | 미확인 | ❌ | ❌ | ❌ |
| 실력(점수) 밸런싱 | ❌ | ❌ (태그 분산만) | ⚠️ 라벨 분산 | ✅ (1–5 등급) | ✅ | ❌ | ✅ MMR/티어 |
| 성별/태그 분산 | ❌ | ✅ 균형 태그 | ✅ | ✅ | ✅ | ❌ | ❌ |
| 일부 팀 잠그고 재편성 | ❌ | ✅ | 미확인 | 미확인 | 미확인 | ⚠️ 다시 섞기만 | ❌ |
| 결과 복사/텍스트 공유 | ❌ | ✅ | 미확인 | 미확인 | 미확인 | ✅ | ✅ (Discord) |
| 이미지 저장 / CSV·Excel | ❌ | ✅ 이미지 | ✅ 이미지·CSV | ✅ Excel | 미확인 | 미확인 | ❌ |
| 명단 그룹 저장 (여러 개) | ⚠️ 1세트 | 미확인 | 미확인 | 미확인 | 미확인 | ✅ (5그룹) | ✅ (서버 저장) |
| 결과 기록 / 히스토리 | ⚠️ 포지션 모드만 | 미확인 | 미확인 | 미확인 | 미확인 | 미확인 | ✅ 전적 |
| 조장/대표 랜덤 뽑기 | ❌ | ✅ | ✅ | 미확인 | 미확인 | 미확인 | ⚠️ 캡틴 드래프트 |
| 공개 연출 (한 팀씩/전체화면) | ❌ | ✅ | ⚠️ 휠 애니메이션 | 미확인 | ✅ 흔들기 | 미확인 | ❌ |
| 포지션/역할 기반 편성 | ⚠️ LoL·2팀 고정 | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| 경기 결과 → 점수 갱신(Elo 등) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| 가입 불필요 / 무료 | ✅ | ✅ (광고) | ✅ | 미확인 | ❌ 유료 앱 | ✅ | ⚠️ 봇 초대·서버 필요 |
| 데이터 기기 내 처리 | ✅ | 미확인 | 미확인 | 미확인 | 미확인 | ✅ | ❌ |

✅ = 구현, ⚠️ = 부분/MVP, ❌ = 없음, 미확인 = 공개 자료로 확인하지 못함

## 3. Positioning Map

```
                  조건·밸런싱 깊이 높음
                          ▲
       devcomma ●         │         ● Kletoi / Discord 내전 봇
          Keamk ●         │         ● LoL Custom Drafter, NCG Squad Builder
   Team Maker ◆ (조건 ✅,  │
          밸런싱 ❌)       │
  범용 ───────────────────┼─────────────────────▶ 게임(LoL) 특화
                          │
   Picker Wheel ●         │   ◆ Team Maker 포지션 모드
   Teamru ● Team Shake ●  │     (LoL 전용이지만 기능은 단순)
   사다리/제비뽑기 ●       │
                          ▼
                  단순 랜덤
```

- **랜덤 모드**: 범용 도구 중 조건 엔진은 상위권(devcomma와 동급, 모순 안내는 더 낫다). 하지만 실력·태그 밸런싱, 공유, 잠금 재편성이 없어 devcomma보다 한 단계 아래.
- **포지션 모드**: LoL 특화 영역에 발을 걸쳤지만 점수·티어 밸런싱이 없어 실질적으로는 "동전 던지기"다. 특화 도구(티어/MMR 밸런싱)와 비교하면 경쟁력이 없다.
- **비어 있는 자리**: "가입·서버 없이 웹에서 바로 쓰는, 티어 기반 내전 밸런서"는 한국어 시장에서 확인된 강자가 없다. 해외 도구는 Discord 봇이나 Riot API, Streamlit 앱 형태라 한국 사용자 진입 장벽이 높다.

## 4. SWOT Analysis

**Strengths**
- 같은 팀/다른 팀/팀 고정을 동시에 만족시키는 엔진과 모순 사유 안내 (테스트 33개로 검증)
- 설치·가입·서버 없음, 데이터가 기기 밖으로 나가지 않음
- 정적 호스팅이라 운영비가 사실상 0
- 한국어 UX 세부 처리 (IME Enter, 조사 처리 등)

**Weaknesses**
- 실력 밸런싱 없음: 경쟁 도구와 내전 도구가 공통으로 내세우는 핵심 기능이 빠져 있음
- 결과 공유 수단이 없음: 결과를 카톡·디스코드로 옮기려면 손으로 다시 쳐야 함
- 포지션 모드가 LoL·2팀·포지션당 2명으로 하드코딩되어 확장 불가
- 기록·명단 관리가 약함 (랜덤 모드 기록 없음, 명단 1세트)
- 제품 정체성이 모호함: README가 템플릿 그대로, 두 화면이 서로 다른 성숙도

**Opportunities**
- 한국어 "롤 내전 팀짜기" 웹 도구에 확인된 강자가 없음 → 티어 입력 + 포지션 + 밸런싱을 묶으면 차별화 가능
- URL 파라미터에 명단·결과를 인코딩하면 서버 없이도 공유 링크 제공 가능
- devcomma처럼 교실·워크숍 수요(성별/태그 분산, 조장 뽑기, 공개 연출)도 정적 앱으로 충분히 구현 가능
- PWA로 오프라인·홈 화면 설치 지원 시 모바일 앱(Teamru, Team Shake)과 경쟁 가능

**Threats**
- 무료 범용 팀 생성기가 매우 많아 검색 유입에서 묻히기 쉬움 (pages.dev 계열 유사 도구 다수)
- devcomma가 이미 한국어로 조건·태그·잠금·공유까지 갖춤
- 내전 커뮤니티는 Discord 봇으로 결과·전적까지 관리하는 흐름이 강함
- localStorage 전용이라 기기 변경·브라우저 정리 시 데이터 유실 → 반복 사용자 이탈 위험

## 5. Key Insights

### 현재 차별점
1. 조건 엔진의 정확성과 "왜 안 되는지" 설명 — 경쟁 도구 중 가장 친절한 편
2. 완전한 클라이언트 처리 (프라이버시, 무료, 무가입)

### Gap 분석 (만들거나 보강해야 할 것)

| 우선순위 | Gap | 근거 | 정적 SPA + localStorage로 가능? |
|---|---|---|---|
| P0 | 결과 공유 (텍스트 복사 → 이미지 저장) | devcomma·Picker Wheel·Teamru 모두 제공. 팀 결과의 최종 목적지는 단톡방 | ✅ (Clipboard API, canvas/html-to-image) |
| P0 | 실력(점수/티어) 밸런싱 | Keamk·Team Shake·내전 도구 공통 핵심 기능. 가장 큰 기능 격차 | ✅ (기존 백트래킹에 점수 합 편차 최소화 추가) |
| P1 | 포지션 모드 일반화 + 티어 밸런싱 | LoL 특화 웹 도구의 빈자리. 지금은 동전 던지기 수준 | ✅ |
| P1 | 일부 팀 잠그고 나머지 재편성 | devcomma 제공. "이 팀은 좋은데 나머지만 다시" 수요 | ✅ (잠근 팀을 고정 조건으로 변환하면 기존 엔진 재사용) |
| P1 | 명단 여러 개 저장 + 결과 기록 (랜덤 모드 포함) | Teamru(5그룹), 팀메이커 앱(히스토리). 반복 사용 유지에 필요 | ✅ |
| P2 | 성별/태그 분산 | devcomma·Picker Wheel·Keamk·Team Shake 제공. 교실·워크숍 수요 | ✅ |
| P2 | 공유 링크 (URL에 명단·결과 인코딩) | 받는 사람이 바로 열어볼 수 있음. 서버 없는 공유 수단 | ✅ (URL hash/압축) |
| P3 | 조장 뽑기·공개 연출·전체화면 | 진행용 부가 기능. 모임 현장 체감 가치 | ✅ |
| 참고 | 경기 결과 기반 점수 갱신(Elo), 기기 간 동기화 | 내전 봇의 강점이지만 서버·계정이 필요 | ⚠️ 기기 내 Elo는 가능, 동기화는 백엔드 필요 |

### 전략적 권고 (우선순위순)
1. **결과 공유부터**: 구현 비용이 가장 낮고 모든 사용자가 매번 체감한다. 텍스트 복사 → 이미지 저장 순.
2. **점수 기반 밸런싱**: 참가자에 선택적 점수(1–5 또는 티어)를 붙이고, 기존 조건 엔진 위에서 팀별 점수 합 편차를 최소화. 조건 엔진이라는 기존 강점과 결합하면 devcomma와도 차별화된다.
3. **포지션 모드 재설계**: 프리셋(LoL 5포지션 등) + 사용자 정의 포지션 + 티어 밸런싱. 한국어 내전 웹 도구라는 빈자리를 노린다.
4. **잠금 후 재편성, 명단·기록 관리**: 반복 사용자를 붙잡는 장치.
5. **태그 분산, 공유 링크, 진행 연출**: 교실·워크숍 수요 흡수.

## Sources
- devcomma 랜덤 조 편성: https://tools.devcomma.com/calculators/random-group-arrangement
- devcomma 멸망전 점수 계산기: https://tools.devcomma.com/calculators/destruction-match-score
- braindetox 랜덤 추첨기: https://braindetox.kr/random_picker.html
- Picker Wheel Team Generator: https://pickerwheel.com/rtg?id=CzC3B
- Keamk About: https://test13091984.keamk.com/about
- Keamk 소개 (outilstice): https://outilstice.com/en/keamk-creer-des-equipes-par-niveau/
- Team Shake (App Store): https://apps.apple.com/us/app/id390812953
- Teamru (App Store): https://apps.apple.com/kr/app/%EA%B0%84%ED%8E%B8%ED%95%9C-%ED%8C%80-%EB%82%98%EB%88%84%EA%B8%B0-teamru/id6481116810
- 팀메이커 - 간편 팀나누기 (App Store): https://apps.apple.com/kr/app/%ED%8C%80%EB%A9%94%EC%9D%B4%EC%BB%A4-%EA%B0%84%ED%8E%B8-%ED%8C%80%EB%82%98%EB%88%84%EA%B8%B0/id6745778716?l=ko
- 랜덤조편성 (App Store): https://apps.apple.com/us/app/id1483482182
- kyumoon/team-maker (점수 정렬 후 랜덤): https://github.com/kyumoon/team-maker
- InventiveHQ Random Team Generator: https://inventivehq.com/tools/random-team-generator
- RiftBalance: https://github.com/Reeyoou/RiftBalance
- League Balancer (itch.io): https://craftersmine.itch.io/league-balancer
- LoL Custom Drafter: https://gh.ali360.cloudns.ch/DottsGit/LoL-Custom-Drafter
- NCG Squad Builder: https://league-squads.pages.dev/about
- League custom game helper bot: https://discordbotlist.com/bots/66gk64e7jqw664
- katson1/inhousebot: https://github.com/katson1/inhousebot
- mrtolkien/inhouse_bot: https://awesome.ecosyste.ms/projects/github.com%2Fmrtolkien%2Finhouse_bot
- In House Queue: https://discordbotlist.com/bots/in-house-queue
- Bjorn: https://gitea.com/fabian_okbro/bjorn/src/

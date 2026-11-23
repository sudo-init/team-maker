import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Shuffle } from 'lucide-react';
import { Button } from '../components/ui/button';
import PageHeader from '../components/PageHeader';
import StepSection from '../components/StepSection';
import ActionBar from '../components/ActionBar';
import TeamCard from '../components/TeamCard';
import CopyButton from '../components/CopyButton';
import ShareButton from '../components/ShareButton';
import { EMPTY_CONSTRAINTS } from '../lib/constraints';
import { splitIntoTeams, type SplitResult } from '../lib/team';
import { balanceTeams, resolveScores, scoreSpread, teamAverages } from '../lib/balance';
import { formatScore, formatTeamsText } from '../lib/share';
import {
  MIN_TEAM_COUNT,
  addNames,
  clearNames,
  loadRoster,
  maxTeamCount,
  removeName,
  saveRoster,
  setBalance,
  setRules,
  setScore,
  setTeamCount,
  type Roster
} from '../lib/roster';
import NameInput from './random/NameInput';
import ParticipantList from './random/ParticipantList';
import TeamCountStepper from './random/TeamCountStepper';
import ConstraintEditor from './random/ConstraintEditor';
import BalanceToggle from './random/BalanceToggle';

const EXAMPLE_NAMES = ['민준', '서연', '도윤', '하은', '시우', '지유', '주원', '서아'];

// 결과 카드가 하나씩 떠오르는 간격(ms).
const REVEAL_STAGGER = 70;

/** 팀 짜기 결과와, 그 결과를 만든 입력. */
interface Outcome {
  roster: Roster;
  result: SplitResult;
  /** 몇 번째로 섞은 결과인지. 다시 섞을 때마다 카드를 새로 그려 등장 연출을 다시 보여준다. */
  round: number;
}

const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const RandomTeams = () => {
  // 처음 그릴 때부터 저장된 명단으로 시작해야 빈 화면이 잠깐 보였다가 바뀌지 않는다.
  const [roster, setRoster] = useState<Roster>(loadRoster);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  // 안내는 관련된 입력 옆에 붙여둔다. 한곳에 모으면 화면 아래에서 조건을 만지다가 놓친다.
  const [nameNotice, setNameNotice] = useState('');
  const [ruleNotice, setRuleNotice] = useState('');
  // 조건은 쓰지 않는 사람이 더 많다. 걸린 조건이 없으면 접어두고, 필요할 때 연다.
  // 저장된 조건이 있어 펼친 채 시작했다면 열린 상태로 기억한다. 그래야 마지막 조건을 지우는
  // 순간 편집기가 접히며 누르던 버튼과 고르던 값이 사라지지 않는다.
  const [rulesOpen, setRulesOpen] = useState(
    () => roster.rules.pairs.length + roster.rules.pins.length > 0
  );
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const failureRef = useRef<HTMLDivElement>(null);

  // 저장은 명단이 바뀔 때 한곳에서만 한다.
  useEffect(() => saveRoster(roster), [roster]);

  // 결과(성공이든 실패 이유든)는 그것을 만든 입력에 묶여 있다. 입력이 조금이라도 바뀌면
  // 옛 결과는 지금 상태와 맞지 않으니 보여주지 않는다. 변경마다 결과를 지우던 방식은
  // 지우는 곳을 하나만 빠뜨려도 낡은 결과가 남았다.
  const current = outcome?.roster === roster ? outcome : null;
  const result = current?.result ?? null;
  const teams = result?.ok ? result.teams : [];
  const { names, teamCount, rules, scores, balance } = roster;
  const ruleCount = rules.pairs.length + rules.pins.length;
  const showRules = rulesOpen || ruleCount > 0;

  // 균형 모드로 만든 결과면 팀별 평균 점수를 함께 보여준다.
  const scoreOf = resolveScores(names, scores);
  const averages = balance && teams.length > 0 ? teamAverages(teams, scoreOf) : undefined;
  const unscored = names.filter(name => scores[name] === undefined).length;

  // 새 결과(또는 실패 이유)가 나오면 화면 밖에 있을 때만 그쪽으로 데려간다. 이미 보이면 그대로 둬서
  // 연달아 "다시 섞기"를 누르는 흐름을 끊지 않는다. 휴대폰에서는 버튼이 화면 아래에 고정돼 있어
  // 이렇게 하지 않으면 실패 이유가 화면 밖에 떠서 눌러도 아무 일 없는 것처럼 보인다.
  useEffect(() => {
    if (!outcome) return;
    const target = outcome.result.ok ? resultHeadingRef.current : failureRef.current;
    if (!target) return;
    const { top } = target.getBoundingClientRect();
    if (top < 0 || top > window.innerHeight * 0.6) {
      target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    }
  }, [outcome]);

  const handleAddNames = (candidates: string[]) => {
    if (candidates.length === 0) {
      setNameNotice('이름을 입력해주세요.');
      return;
    }
    const { roster: next, duplicated } = addNames(roster, candidates);
    setRoster(next);
    setNameNotice(
      duplicated.length > 0 ? `이미 있는 이름은 건너뛰었어요: ${duplicated.join(', ')}` : ''
    );
  };

  const handleRemoveName = (name: string) => {
    setRoster(removeName(roster, name));
    setNameNotice('');
    setRuleNotice('');
  };

  const handleClearNames = () => {
    setRoster(clearNames(roster));
    setNameNotice('');
    setRuleNotice('');
  };

  const handleTeamCount = (count: number) => {
    const { roster: next, droppedPins } = setTeamCount(roster, count);
    setRoster(next);
    if (droppedPins > 0) setRuleNotice('없어진 팀에 걸려 있던 고정 조건을 정리했어요.');
  };

  const handleClearRules = () => {
    setRoster(setRules(roster, EMPTY_CONSTRAINTS));
    setRuleNotice('');
  };

  const makeTeams = () => {
    const result = balance
      ? balanceTeams(names, teamCount, rules, scores)
      : splitIntoTeams(names, teamCount, rules);
    setOutcome(prev => ({ roster, result, round: (prev?.round ?? 0) + 1 }));
  };

  const notEnoughPeople = names.length < teamCount;
  const round = current?.round ?? 0;

  return (
    <div className="space-y-10">
      <PageHeader
        title="랜덤 팀 짜기"
        description="이름을 넣고 몇 팀으로 나눌지 정하면 끝. 같은 팀·다른 팀 조건과 실력 균형도 맞춰요."
      />

      <StepSection
        step={1}
        title={
          <>
            참가자
            {names.length > 0 && (
              <span className="rounded-full bg-primary/12 px-2 py-0.5 text-xs font-bold text-primary tabular-nums">
                {names.length}명
              </span>
            )}
          </>
        }
        aside={
          names.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClearNames} className="text-muted-foreground">
              전체 삭제
            </Button>
          )
        }
      >
        <NameInput onAdd={handleAddNames} notice={nameNotice} />
        <ParticipantList
          names={names}
          onRemove={handleRemoveName}
          onFillExample={() => handleAddNames(EXAMPLE_NAMES)}
          scoring={
            balance
              ? {
                  scores,
                  onChange: (name, score) => setRoster(setScore(roster, name, score))
                }
              : undefined
          }
        />
      </StepSection>

      <StepSection step={2} title="팀 구성">
        <div className="divide-y rounded-xl border bg-card px-4 shadow-xs [&>*]:py-4">
          <TeamCountStepper
            value={teamCount}
            min={MIN_TEAM_COUNT}
            max={maxTeamCount(names)}
            people={names.length}
            onChange={handleTeamCount}
          />
          <BalanceToggle
            enabled={balance}
            onChange={enabled => setRoster(setBalance(roster, enabled))}
            unscored={unscored}
          />
        </div>
      </StepSection>

      <StepSection
        step={3}
        title={
          <>
            조건
            <span className="text-sm font-medium text-muted-foreground">
              {ruleCount > 0 ? `${ruleCount}개` : '선택'}
            </span>
          </>
        }
        aside={
          ruleCount > 0 ? (
            <Button variant="ghost" size="sm" onClick={handleClearRules} className="text-muted-foreground">
              조건 비우기
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRulesOpen(open => !open)}
              aria-expanded={showRules}
              aria-controls="rule-editor"
            >
              {showRules ? '접기' : '조건 걸기'}
            </Button>
          )
        }
      >
        {showRules ? (
          <div id="rule-editor">
            <ConstraintEditor
              names={names}
              teamCount={teamCount}
              rules={rules}
              onChange={next => setRoster(setRules(roster, next))}
              notice={ruleNotice}
              onNotice={setRuleNotice}
            />
          </div>
        ) : (
          <p id="rule-editor" className="text-sm text-muted-foreground">
            꼭 갈라야 하는 사람, 붙여야 하는 사람, 특정 팀에 고정할 사람을 정할 수 있어요.
          </p>
        )}
      </StepSection>

      <ActionBar>
        <Button size="lg" onClick={makeTeams} className="w-full" disabled={notEnoughPeople}>
          {/* key가 바뀔 때마다 아이콘이 한 바퀴 구른다. */}
          <Shuffle key={round} className={round > 0 ? 'animate-tumble' : undefined} />
          {teams.length > 0 ? '다시 섞기' : '팀 짜기'}
          {names.length > 0 && (
            <span className="font-medium opacity-80 tabular-nums">· {names.length}명</span>
          )}
        </Button>
        {/* 버튼이 왜 눌리지 않는지 알려준다. */}
        {notEnoughPeople && (
          <p className="text-center text-xs text-muted-foreground">
            {teamCount}팀으로 나누려면 최소 {teamCount}명이 필요해요.
          </p>
        )}
      </ActionBar>

      {/* 조건이 서로 부딪혀 팀을 못 만든 이유. */}
      {result && !result.ok && (
        <div
          ref={failureRef}
          role="alert"
          className="flex scroll-mt-20 gap-3 rounded-xl border border-destructive/30 bg-destructive/8 p-4 text-sm"
        >
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="space-y-1">
            <p className="font-semibold">팀을 만들지 못했어요</p>
            <p className="text-muted-foreground">{result.reason}</p>
          </div>
        </div>
      )}

      {/* 다시 섞어도 같은 문장이면 화면낭독기가 읽지 않으므로 회차를 붙여 바꿔준다. */}
      <p role="status" className="sr-only">
        {teams.length > 0 ? `${teams.length}팀으로 나눴어요. ${round}번째 결과.` : ''}
      </p>

      {teams.length > 0 && (
        <section aria-labelledby="result-heading" className="scroll-mt-20 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2
                id="result-heading"
                ref={resultHeadingRef}
                className="scroll-mt-20 font-display text-2xl font-extrabold tracking-tight"
              >
                결과
              </h2>
              <p className="text-sm text-muted-foreground tabular-nums">
                {teams.length}팀 · {names.length}명
                {averages && (
                  <>
                    {' · '}
                    <span className="font-semibold text-foreground">
                      평균 점수 차이 {formatScore(scoreSpread(teams, scoreOf))}
                    </span>
                  </>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <ShareButton getText={() => formatTeamsText(teams, averages)} />
              <CopyButton getText={() => formatTeamsText(teams, averages)} />
            </div>
          </div>
          <div key={round} className="grid gap-4 sm:grid-cols-2">
            {teams.map((team, index) => (
              <TeamCard
                key={index}
                index={index}
                mark={String(index + 1)}
                title={`${index + 1}팀`}
                meta={`${team.length}명${averages ? ` · 평균 ${formatScore(averages[index])}` : ''}`}
                revealDelay={index * REVEAL_STAGGER}
                members={team.map(name => ({
                  key: name,
                  name,
                  detail:
                    balance && scores[name] !== undefined ? formatScore(scores[name]) : undefined
                }))}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default RandomTeams;

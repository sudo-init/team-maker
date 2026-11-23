import { useEffect, useState } from 'react';
import { AlertTriangle, History, RotateCcw, Swords } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import PageHeader from '../components/PageHeader';
import TeamCard, { type TeamMember } from '../components/TeamCard';
import CopyButton from '../components/CopyButton';
import ShareButton from '../components/ShareButton';
import { formatMatchText } from '../lib/share';
import { relativeTime } from '../lib/text';
import {
  MAX_RECORDS,
  POSITIONS,
  createRecord,
  emptySlots,
  parseStoredRecords,
  splitByPosition,
  type Player,
  type Position,
  type PositionMatch,
  type TeamRecord
} from '../lib/positions';
import { readStored, writeStored } from '../lib/storage';

const RECORDS_KEY = 'teamRecords';

// 카드 폭이 좁아 포지션은 짧게 쓴다. 복사하는 글에는 원래 이름을 쓴다.
const POSITION_SHORT: Record<Position, string> = {
  TOP: 'TOP',
  JUNGLE: 'JGL',
  MID: 'MID',
  ADC: 'ADC',
  SUPPORT: 'SUP'
};

const loadRecords = () => readStored(RECORDS_KEY, parseStoredRecords) ?? [];

const toMembers = (players: Player[]): TeamMember[] =>
  players.map(player => ({
    key: player.position,
    name: player.name,
    tag: POSITION_SHORT[player.position]
  }));

interface MatchViewProps {
  match: PositionMatch;
  compact?: boolean;
  /** 넘기면 카드가 차례로 떠오른다. */
  reveal?: boolean;
}

/** A팀·B팀을 나란히 놓는다. 결과와 기록이 같은 모양을 쓴다. */
const MatchView = ({ match, compact = false, reveal = false }: MatchViewProps) => (
  <div
    className={
      compact
        ? 'grid grid-cols-2 gap-2'
        : 'grid grid-cols-2 items-center gap-3 sm:grid-cols-[1fr_auto_1fr]'
    }
  >
    <TeamCard
      index={0}
      mark="A"
      title="A팀"
      members={toMembers(match.teamA)}
      compact={compact}
      revealDelay={reveal ? 0 : undefined}
    />
    {!compact && (
      <span
        aria-hidden
        className="hidden font-display text-xl font-extrabold text-muted-foreground sm:block"
      >
        VS
      </span>
    )}
    <TeamCard
      index={1}
      mark="B"
      title="B팀"
      members={toMembers(match.teamB)}
      compact={compact}
      revealDelay={reveal ? 90 : undefined}
    />
  </div>
);

const TeamDivider = () => {
  const [slots, setSlots] = useState(emptySlots);
  const [match, setMatch] = useState<PositionMatch | null>(null);
  // 다시 나눌 때마다 카드를 새로 그려 등장 연출을 다시 보여준다.
  const [round, setRound] = useState(0);
  const [error, setError] = useState('');
  // 처음 그릴 때부터 저장된 기록을 갖고 시작해야 빈 목록이 잠깐 보였다가 바뀌지 않는다.
  const [records, setRecords] = useState<TeamRecord[]>(loadRecords);
  const [showHistory, setShowHistory] = useState(false);

  // 저장은 기록이 바뀔 때 한곳에서만 한다.
  useEffect(() => writeStored(RECORDS_KEY, records), [records]);

  const changeSlot = (position: Position, index: 0 | 1, value: string) => {
    setSlots(prev => {
      const next: [string, string] = [...prev[position]];
      next[index] = value;
      return { ...prev, [position]: next };
    });
    setError('');
  };

  const makeTeams = () => {
    const result = splitByPosition(slots);
    if (!result.ok) {
      setError(result.reason);
      return;
    }

    const next = { teamA: result.teamA, teamB: result.teamB };
    setMatch(next);
    setRound(prev => prev + 1);
    setError('');
    setRecords(prev => [createRecord(next), ...prev].slice(0, MAX_RECORDS));
  };

  const reset = () => {
    setSlots(emptySlots());
    setMatch(null);
    setError('');
  };

  const clearHistory = () => {
    if (!window.confirm(`저장된 기록 ${records.length}개를 모두 지울까요?`)) return;
    setRecords([]);
  };

  // 기록을 그릴 때 한 번만 잰다. 화면을 열어둔 채 시간이 흘러도 "방금 전"이 남는 정도는 괜찮다.
  const now = Date.now();

  return (
    <div className="space-y-10">
      <PageHeader
        title="포지션별 팀 나누기"
        description="포지션마다 두 명을 넣으면 한 명씩 A팀과 B팀으로 갈라요. 내전 라인 매칭에 맞춰져 있어요."
        action={
          <Button
            variant="outline"
            onClick={() => setShowHistory(prev => !prev)}
            aria-label={showHistory ? '기록 닫기' : '기록 보기'}
            aria-expanded={showHistory}
            aria-controls="match-history"
            className="shrink-0"
          >
            <History />
            <span className="hidden sm:inline">기록</span>
            {records.length > 0 && <span className="tabular-nums text-muted-foreground">{records.length}</span>}
          </Button>
        }
      />

      <section aria-label="선수 입력" className="space-y-4">
        <div className="divide-y rounded-xl border bg-card shadow-xs">
          {POSITIONS.map(position => (
            <div
              key={position}
              className="grid grid-cols-[3rem_1fr_auto_1fr] items-center gap-2 px-3 py-2.5 sm:grid-cols-[4rem_1fr_auto_1fr] sm:gap-3 sm:px-4"
            >
              <span className="font-display text-sm font-extrabold tracking-wide text-primary" title={position}>
                {POSITION_SHORT[position]}
              </span>
              {([0, 1] as const).map(index => (
                <Input
                  key={index}
                  placeholder={`선수 ${index + 1}`}
                  aria-label={`${position} 선수 ${index + 1}`}
                  autoComplete="off"
                  value={slots[position][index]}
                  onChange={e => changeSlot(position, index, e.target.value)}
                  // 두 입력칸 사이에 "vs"를 끼우기 위해 두 번째 칸만 순서를 뒤로 민다.
                  className={index === 1 ? 'order-last' : undefined}
                />
              ))}
              <span aria-hidden className="text-xs font-semibold text-muted-foreground">
                vs
              </span>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button size="lg" onClick={makeTeams} className="flex-1">
            <Swords key={round} className={round > 0 ? 'animate-tumble' : undefined} />
            {match ? '다시 나누기' : '팀 나누기'}
          </Button>
          <Button size="lg" variant="outline" onClick={reset}>
            <RotateCcw />
            초기화
          </Button>
        </div>

        {error && (
          <div
            role="alert"
            className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive/8 p-4 text-sm"
          >
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p>{error}</p>
          </div>
        )}
      </section>

      <p role="status" className="sr-only">
        {match ? `A팀과 B팀으로 나눴어요. ${round}번째 결과.` : ''}
      </p>

      {match && (
        <section aria-labelledby="match-heading" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="match-heading" className="font-display text-2xl font-extrabold tracking-tight">
              결과
            </h2>
            <div className="flex gap-2">
              <ShareButton getText={() => formatMatchText(match)} />
              <CopyButton getText={() => formatMatchText(match)} />
            </div>
          </div>
          <MatchView key={round} match={match} reveal />
        </section>
      )}

      {showHistory && (
        <section id="match-history" aria-labelledby="history-heading" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 id="history-heading" className="text-lg font-bold">
              지난 기록
              <span className="ml-2 text-sm font-medium text-muted-foreground">최근 {MAX_RECORDS}개까지</span>
            </h2>
            {records.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearHistory} className="text-destructive">
                기록 삭제
              </Button>
            )}
          </div>
          {records.length === 0 ? (
            <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              아직 기록이 없어요. 팀을 나누면 여기에 차곡차곡 쌓여요.
            </p>
          ) : (
            <ol className="space-y-3">
              {records.map(record => {
                const ago = record.createdAt === undefined ? '' : relativeTime(record.createdAt, now);
                return (
                  <li key={record.id} className="space-y-2 rounded-xl bg-muted/60 p-3">
                    <p className="text-xs text-muted-foreground">
                      {ago && <span className="mr-1.5 font-semibold text-foreground">{ago}</span>}
                      {record.date}
                    </p>
                    <MatchView match={record} compact />
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      )}
    </div>
  );
};

export default TeamDivider;

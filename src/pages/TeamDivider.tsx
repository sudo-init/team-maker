import { useEffect, useState } from 'react';
import { Dice1, History } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import TeamCard, { type TeamMember } from '../components/TeamCard';
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

const loadRecords = () => readStored(RECORDS_KEY, parseStoredRecords) ?? [];

const toMembers = (players: Player[]): TeamMember[] =>
  players.map(player => ({ key: player.position, name: player.name, tag: player.position }));

/** A팀·B팀을 나란히 놓는다. 결과와 기록이 같은 모양을 쓴다. */
const MatchView = ({ match, compact }: { match: PositionMatch; compact?: boolean }) => (
  <div className={compact ? 'grid grid-cols-2 gap-4' : 'grid grid-cols-2 gap-6'}>
    <TeamCard index={0} title="A팀" members={toMembers(match.teamA)} compact={compact} />
    <TeamCard index={1} title="B팀" members={toMembers(match.teamB)} compact={compact} />
  </div>
);

const TeamDivider = () => {
  const [slots, setSlots] = useState(emptySlots);
  const [match, setMatch] = useState<PositionMatch | null>(null);
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

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>포지션별 팀 구성</CardTitle>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowHistory(prev => !prev)}
            aria-label={showHistory ? '기록 닫기' : '기록 보기'}
            aria-expanded={showHistory}
            className="ml-2"
          >
            <History className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {POSITIONS.map(position => (
              <div key={position} className="grid grid-cols-[5.5rem_1fr_1fr] gap-2 sm:gap-4 items-center">
                <div className="font-bold text-primary">{position}</div>
                {([0, 1] as const).map(index => (
                  <Input
                    key={index}
                    placeholder={`선수 ${index + 1}`}
                    aria-label={`${position} 선수 ${index + 1}`}
                    value={slots[position][index]}
                    onChange={e => changeSlot(position, index, e.target.value)}
                  />
                ))}
              </div>
            ))}

            <div className="space-y-2">
              <div className="flex gap-4">
                <Button onClick={makeTeams} className="flex-1">
                  <Dice1 className="mr-2 h-4 w-4" />
                  팀 나누기
                </Button>
                <Button variant="secondary" onClick={reset} className="flex-1">
                  초기화
                </Button>
              </div>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>

            {match && <MatchView match={match} />}

            {showHistory && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg">팀 기록</h3>
                  {records.length > 0 && (
                    <Button variant="destructive" size="sm" onClick={clearHistory}>
                      기록 삭제
                    </Button>
                  )}
                </div>
                {records.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    아직 저장된 기록이 없습니다. 팀을 나누면 여기에 기록됩니다.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {records.map(record => (
                      <Card key={record.id} className="bg-gray-50">
                        <CardContent className="p-4">
                          <div className="text-sm text-gray-500 mb-2">{record.date}</div>
                          <MatchView match={record} compact />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamDivider;

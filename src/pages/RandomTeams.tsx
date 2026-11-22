import { useEffect, useState } from 'react';
import { Shuffle, Users } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import TeamCard from '../components/TeamCard';
import CopyButton from '../components/CopyButton';
import { splitIntoTeams, type SplitResult } from '../lib/team';
import { formatTeamsText } from '../lib/share';
import {
  MIN_TEAM_COUNT,
  addNames,
  clearNames,
  loadRoster,
  maxTeamCount,
  removeName,
  saveRoster,
  setRules,
  setTeamCount,
  type Roster
} from '../lib/roster';
import NameInput from './random/NameInput';
import ParticipantList from './random/ParticipantList';
import TeamCountStepper from './random/TeamCountStepper';
import ConstraintEditor from './random/ConstraintEditor';

/** 팀 짜기 결과와, 그 결과를 만든 입력. */
interface Outcome {
  roster: Roster;
  result: SplitResult;
}

const RandomTeams = () => {
  // 처음 그릴 때부터 저장된 명단으로 시작해야 빈 화면이 잠깐 보였다가 바뀌지 않는다.
  const [roster, setRoster] = useState<Roster>(loadRoster);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  // 안내는 관련된 입력 옆에 붙여둔다. 한곳에 모으면 화면 아래에서 조건을 만지다가 놓친다.
  const [nameNotice, setNameNotice] = useState('');
  const [ruleNotice, setRuleNotice] = useState('');

  // 저장은 명단이 바뀔 때 한곳에서만 한다.
  useEffect(() => saveRoster(roster), [roster]);

  // 결과(성공이든 실패 이유든)는 그것을 만든 입력에 묶여 있다. 입력이 조금이라도 바뀌면
  // 옛 결과는 지금 상태와 맞지 않으니 보여주지 않는다. 변경마다 결과를 지우던 방식은
  // 지우는 곳을 하나만 빠뜨려도 낡은 결과가 남았다.
  const result = outcome?.roster === roster ? outcome.result : null;
  const teams = result?.ok ? result.teams : [];
  const { names, teamCount, rules } = roster;

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

  const makeTeams = () => {
    setOutcome({ roster, result: splitIntoTeams(names, teamCount, rules) });
  };

  const notEnoughPeople = names.length < teamCount;

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            이름으로 랜덤 팀 짜기
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <NameInput onAdd={handleAddNames} notice={nameNotice} />

            <ParticipantList
              names={names}
              onRemove={handleRemoveName}
              onClear={handleClearNames}
            />

            <TeamCountStepper
              value={teamCount}
              min={MIN_TEAM_COUNT}
              max={maxTeamCount(names)}
              onChange={handleTeamCount}
            />

            <ConstraintEditor
              names={names}
              teamCount={teamCount}
              rules={rules}
              onChange={next => setRoster(setRules(roster, next))}
              notice={ruleNotice}
              onNotice={setRuleNotice}
            />

            <div className="space-y-2">
              <Button onClick={makeTeams} className="w-full" disabled={notEnoughPeople}>
                <Shuffle className="mr-2 h-4 w-4" />
                {teams.length > 0 ? '다시 섞기' : '팀 짜기'}
              </Button>
              {/* 버튼이 왜 눌리지 않는지 알려준다. */}
              {notEnoughPeople && (
                <p className="text-center text-sm text-muted-foreground">
                  {teamCount}팀으로 나누려면 최소 {teamCount}명이 필요해요.
                </p>
              )}
              {/* 조건이 서로 부딪혀 팀을 못 만든 이유는 버튼 바로 아래에 둔다. */}
              {result && !result.ok && (
                <p role="alert" className="text-sm text-destructive">
                  {result.reason}
                </p>
              )}
            </div>

            {teams.length > 0 && (
              <section aria-label="팀 결과" className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">{teams.length}팀으로 나눴어요.</p>
                  <CopyButton getText={() => formatTeamsText(teams)} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {teams.map((team, index) => (
                    <TeamCard
                      key={index}
                      index={index}
                      title={`${index + 1}팀 (${team.length}명)`}
                      members={team.map(name => ({ key: name, name }))}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RandomTeams;

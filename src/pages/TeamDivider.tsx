import React, { useState, ChangeEvent, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dice1, History, Trash2, Trash } from 'lucide-react';

type Position = 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT';

interface Player {
  name: string;
  position: Position;
}

interface TeamRecord {
  id: string;
  date: string;
  teamA: Player[];
  teamB: Player[];
}

const POSITIONS: Position[] = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];

const TeamDivider = () => {
  const [players, setPlayers] = useState<Record<Position, [string, string]>>({
    TOP: ['', ''],
    JUNGLE: ['', ''],
    MID: ['', ''],
    ADC: ['', ''],
    SUPPORT: ['', '']
  });

  const [teamA, setTeamA] = useState<Player[]>([]);
  const [teamB, setTeamB] = useState<Player[]>([]);
  const [records, setRecords] = useState<TeamRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    // localStorage에서 기록 불러오기
    const savedRecords = localStorage.getItem('teamRecords');
    if (savedRecords) {
      setRecords(JSON.parse(savedRecords));
    }
  }, []);

  const handlePlayerChange = (position: Position, index: number, value: string) => {
    setPlayers(prev => ({
      ...prev,
      [position]: index === 0 ? [value, prev[position][1]] : [prev[position][0], value]
    }));
  };

  const saveTeamRecord = (newTeamA: Player[], newTeamB: Player[]) => {
    const newRecord: TeamRecord = {
      id: Date.now().toString(),
      date: new Date().toLocaleString(),
      teamA: newTeamA,
      teamB: newTeamB
    };

    const updatedRecords = [newRecord, ...records];
    setRecords(updatedRecords);
    localStorage.setItem('teamRecords', JSON.stringify(updatedRecords));
  };

  const makeTeams = () => {
    // 모든 포지션에 두 명의 선수가 입력되었는지 확인
    const isAllFilled = Object.values(players).every(([p1, p2]) => p1 && p2);
    if (!isAllFilled) {
      alert('모든 포지션에 선수를 입력해주세요!');
      return;
    }

    // 각 포지션별로 랜덤하게 팀 배정
    const newTeamA: Player[] = [];
    const newTeamB: Player[] = [];

    POSITIONS.forEach(position => {
      const [player1, player2] = players[position];
      if (Math.random() > 0.5) {
        newTeamA.push({ name: player1, position });
        newTeamB.push({ name: player2, position });
      } else {
        newTeamA.push({ name: player2, position });
        newTeamB.push({ name: player1, position });
      }
    });

    setTeamA(newTeamA);
    setTeamB(newTeamB);
    saveTeamRecord(newTeamA, newTeamB);
  };

  const resetTeams = () => {
    setPlayers({
      TOP: ['', ''],
      JUNGLE: ['', ''],
      MID: ['', ''],
      ADC: ['', ''],
      SUPPORT: ['', '']
    });
    setTeamA([]);
    setTeamB([]);
  };

  const clearHistory = () => {
    setRecords([]);
    localStorage.removeItem('teamRecords');
  };

  const deleteRecord = (recordId: string) => {
    const updatedRecords = records.filter(record => record.id !== recordId);
    setRecords(updatedRecords);
    localStorage.setItem('teamRecords', JSON.stringify(updatedRecords));
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>포지션별 팀 구성</CardTitle>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowHistory(!showHistory)}
            className="ml-2"
          >
            <History className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* 포지션별 입력 */}
            {POSITIONS.map((position) => (
              <div key={position} className="grid grid-cols-3 gap-4 items-center">
                <div className="font-bold text-primary">{position}</div>
                <Input
                  placeholder="선수 1"
                  value={players[position][0]}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    handlePlayerChange(position, 0, e.target.value)
                  }
                />
                <Input
                  placeholder="선수 2"
                  value={players[position][1]}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    handlePlayerChange(position, 1, e.target.value)
                  }
                />
              </div>
            ))}

            <div className="flex gap-4 mt-6">
              <Button onClick={makeTeams} className="flex-1">
                <Dice1 className="mr-2 h-4 w-4" />
                팀 나누기
              </Button>
              <Button variant="secondary" onClick={resetTeams} className="flex-1">
                초기화
              </Button>
            </div>

            {/* 팀 결과 표시 */}
            {teamA.length > 0 && (
              <div className="grid grid-cols-2 gap-6 mt-6">
                <div className="space-y-2">
                  <h3 className="font-bold text-lg text-blue-600">A팀</h3>
                  {teamA.map((player) => (
                    <div key={player.position} className="flex justify-between bg-blue-50 p-2 rounded">
                      <span className="font-medium">{player.position}</span>
                      <span>{player.name}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-lg text-red-600">B팀</h3>
                  {teamB.map((player) => (
                    <div key={player.position} className="flex justify-between bg-red-50 p-2 rounded">
                      <span className="font-medium">{player.position}</span>
                      <span>{player.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 기록 목록 */}
            {showHistory && records.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg">팀 기록</h3>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={clearHistory}
                    className="bg-red-500 hover:bg-red-600 text-white font-medium px-4 py-2 rounded-md shadow-sm flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    전체 기록 삭제
                  </Button>
                </div>
                <div className="space-y-4">
                  {records.map((record) => (
                    <Card key={record.id} className="bg-gray-50">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center mb-2">
                          <div className="text-sm text-gray-500">{record.date}</div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteRecord(record.id)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <h4 className="font-medium text-blue-600">A팀</h4>
                            {record.teamA.map((player) => (
                              <div key={player.position} className="flex justify-between text-sm">
                                <span className="font-medium">{player.position}</span>
                                <span>{player.name}</span>
                              </div>
                            ))}
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-medium text-red-600">B팀</h4>
                            {record.teamB.map((player) => (
                              <div key={player.position} className="flex justify-between text-sm">
                                <span className="font-medium">{player.position}</span>
                                <span>{player.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamDivider;
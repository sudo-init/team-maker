import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import TeamDivider from './pages/TeamDivider';
import RandomTeams from './pages/RandomTeams';

function App() {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<TeamDivider />} />
          <Route path="random" element={<RandomTeams />} />
          {/* 미구현 경로로 들어와도 빈 화면 대신 팀 나누기 화면을 보여준다. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import TeamDivider from './pages/TeamDivider';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<TeamDivider />} />
          <Route path="teams" element={<div>팀 목록</div>} />
          <Route path="create" element={<div>팀 생성</div>} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;

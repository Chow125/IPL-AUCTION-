import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LobbyRoom from './pages/LobbyRoom';
import AuctionRoom from './pages/AuctionRoom';
import TeamDashboard from './pages/TeamDashboard';
import ToastContainer from './components/Toast';

function App() {
  return (
    <Router>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/room/:roomCode" element={<LobbyRoom />} />
        <Route path="/auction/:roomCode" element={<AuctionRoom />} />
        <Route path="/dashboard/:roomCode" element={<TeamDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;

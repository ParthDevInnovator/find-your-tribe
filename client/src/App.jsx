import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Host from './pages/Host.jsx';
import Play from './pages/Play.jsx';
import Stats from './pages/Stats.jsx';
import { Screen, Button } from './components/ui.jsx';

function NotFound() {
  return (
    <Screen>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="text-7xl">🧭</div>
        <h1 className="mt-4 font-display text-3xl font-extrabold">Lost on the trail</h1>
        <p className="mt-2 text-ink-soft">This page doesn't exist.</p>
        <Button to="/" className="mt-8">Back to start</Button>
      </div>
    </Screen>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/host/:code" element={<Host />} />
      <Route path="/r/:code" element={<Play />} />
      <Route path="/stats" element={<Stats />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { Screen, ErrorNote, Loading } from '../components/ui.jsx';

function Tile({ emoji, value, label, sub, accent }) {
  return (
    <div className={`rounded-3xl p-4 shadow-sm ${accent ? 'bg-coral text-white' : 'bg-white'}`}>
      <div className="text-2xl">{emoji}</div>
      <div className="mt-1 font-display text-4xl font-extrabold tabular-nums leading-none">{value}</div>
      <div className={`mt-1 text-sm font-bold ${accent ? 'text-white/90' : 'text-ink-soft'}`}>{label}</div>
      {sub && <div className={`text-xs font-semibold ${accent ? 'text-white/80' : 'text-ink-soft/80'}`}>{sub}</div>}
    </div>
  );
}

const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '0%');

export default function Stats() {
  const [s, setS] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    const load = () => api('/stats').then((d) => alive && (setS(d), setError(''))).catch((e) => alive && setError(e.message));
    load();
    const id = setInterval(load, 15000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (!s) return error ? <Screen><ErrorNote>{error}</ErrorNote></Screen> : <Loading label="Counting explorers…" />;

  const repeatTotal = s.wouldRepeat.yes + s.wouldRepeat.maybe + s.wouldRepeat.no;

  return (
    <Screen wide>
      <header className="pt-2">
        <Link to="/" className="font-display text-lg font-bold text-ink-soft">← 🏝️ Find Your Tribe</Link>
        <h1 className="mt-2 font-display text-4xl font-extrabold">Real-world results</h1>
        <p className="font-semibold text-ink-soft">Live usage data only — test rooms are excluded. Updates every 15 seconds.</p>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile emoji="🧑‍🤝‍🧑" value={s.uniqueParticipants} label="Unique participants" sub={`${s.participants} joins total`} accent />
        <Tile emoji="🏠" value={s.rooms} label="Rooms created" sub={`${s.roomsPlayed} played`} />
        <Tile emoji="✅" value={s.answered} label="Completed questions" sub={`${pct(s.answered, s.participants)} of joins`} />
        <Tile emoji="🏝️" value={s.teams} label="Tribes formed" />
        <Tile emoji="🎯" value={s.challengeStarted} label="Started a challenge" />
        <Tile emoji="🎉" value={s.challengeDone} label="Completed a challenge" sub={`${s.teamsCompleted} tribes reported done`} />
        <Tile emoji="📝" value={s.feedback} label="Submitted feedback" />
        <Tile emoji="💬" value={s.talkedToNew} label="Talked to someone new" sub={`${pct(s.talkedToNew, s.feedback)} of feedback`} accent />
      </div>

      <div className="mt-4 rounded-3xl bg-white p-5 shadow-sm">
        <p className="font-display text-lg font-bold">Would enjoy another activity with their tribe</p>
        <div className="mt-3 flex h-4 overflow-hidden rounded-full bg-sand">
          {repeatTotal > 0 && (
            <>
              <div className="bg-sea" style={{ width: pct(s.wouldRepeat.yes, repeatTotal) }} />
              <div className="bg-[#FFC53D]" style={{ width: pct(s.wouldRepeat.maybe, repeatTotal) }} />
              <div className="bg-ink-soft/40" style={{ width: pct(s.wouldRepeat.no, repeatTotal) }} />
            </>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm font-bold">
          <span><i className="mr-1 inline-block h-3 w-3 rounded-full bg-sea align-middle" />Yes {s.wouldRepeat.yes}</span>
          <span><i className="mr-1 inline-block h-3 w-3 rounded-full bg-[#FFC53D] align-middle" />Maybe {s.wouldRepeat.maybe}</span>
          <span><i className="mr-1 inline-block h-3 w-3 rounded-full bg-ink-soft/40 align-middle" />No {s.wouldRepeat.no}</span>
        </div>
      </div>

      <p className="mt-3 text-xs font-semibold text-ink-soft">Last updated {new Date(s.updatedAt).toLocaleTimeString()}</p>
      <ErrorNote>{error}</ErrorNote>
    </Screen>
  );
}

import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { storage, hostKey } from '../lib/storage.js';
import { Screen, Button, Card, ErrorNote } from '../components/ui.jsx';

export default function Home() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isTest = params.get('test') === '1';
  const [code, setCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  async function createRoom() {
    setCreating(true);
    setError('');
    try {
      const { code: newCode, hostToken } = await api('/rooms', { method: 'POST', body: { isTest } });
      storage.set(hostKey(newCode), hostToken);
      navigate(`/host/${newCode}`);
    } catch (e) {
      setError(e.message);
      setCreating(false);
    }
  }

  function join(e) {
    e.preventDefault();
    const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length >= 4) navigate(`/r/${clean}`);
    else setError('Room codes have 5 characters');
  }

  return (
    <Screen>
      <section className="flex flex-col items-center pt-8 text-center">
        <div className="anim-float text-[88px] leading-none">🏝️</div>
        <h1 className="anim-rise mt-4 font-display text-5xl font-extrabold leading-none tracking-tight">
          Find Your <span className="text-coral">Tribe</span>
        </h1>
        <p className="anim-rise mt-3 max-w-xs text-lg font-semibold text-ink-soft" style={{ animationDelay: '.1s' }}>
          One QR. Five questions. Your tribe. Real conversations.
        </p>
      </section>

      <div className="anim-rise mt-10 flex flex-col gap-4" style={{ animationDelay: '.2s' }}>
        <Card>
          <h2 className="font-display text-2xl font-bold">Hosting a group? 🎤</h2>
          <p className="mt-1 text-ink-soft">Create a room and let everyone scan your QR code. Takes 5–8 minutes.</p>
          <Button className="mt-4" onClick={createRoom} loading={creating}>Create a room</Button>
          {isTest && <p className="mt-2 text-center text-xs font-bold text-coral">TEST MODE — this room won't count in results</p>}
        </Card>

        <Card>
          <h2 className="font-display text-2xl font-bold">Got a room code? 🎟️</h2>
          <form onSubmit={join} className="mt-3 flex gap-2">
            <input
              value={code}
              onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(''); }}
              placeholder="AB3KX"
              maxLength={8}
              autoCapitalize="characters"
              autoComplete="off"
              aria-label="Room code"
              className="min-w-0 flex-1 rounded-2xl border-2 border-sand-deep bg-sand px-4 text-center font-display text-2xl font-bold uppercase tracking-[0.3em] outline-none focus:border-coral"
            />
            <button type="submit" className="rounded-2xl bg-ink px-5 font-display text-lg font-bold text-white active:scale-95">Join</button>
          </form>
        </Card>
        <ErrorNote>{error}</ErrorNote>
      </div>

      <ol className="mt-8 grid grid-cols-4 gap-2 text-center text-xs font-bold text-ink-soft">
        {[['📱', 'Scan'], ['❓', '5 questions'], ['🫂', 'Meet tribe'], ['🎯', 'Challenge']].map(([e, t]) => (
          <li key={t} className="rounded-2xl bg-white/60 px-1 py-3"><div className="text-2xl">{e}</div>{t}</li>
        ))}
      </ol>

      <Link to="/stats" className="mt-6 text-center text-sm font-bold text-ink-soft underline underline-offset-4">See live results</Link>
    </Screen>
  );
}

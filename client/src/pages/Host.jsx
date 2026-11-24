import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../lib/api.js';
import { storage, hostKey } from '../lib/storage.js';
import { useRoomEvents } from '../lib/socket.js';
import { Screen, Button, Card, ErrorNote, Loading } from '../components/ui.jsx';
import { CHALLENGES } from '../../../shared/gameData.js';

function Stat({ value, label, emoji }) {
  return (
    <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
      <div className="text-xl">{emoji}</div>
      <div className="font-display text-3xl font-extrabold leading-none">{value}</div>
      <div className="mt-1 text-xs font-bold text-ink-soft">{label}</div>
    </div>
  );
}

export default function Host() {
  const code = useParams().code.toUpperCase();
  const token = storage.get(hostKey(code));
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);
  const joinUrl = `${window.location.origin}/r/${code}`;

  const load = useCallback(async () => {
    try {
      setData(await api(`/rooms/${code}/host`, { headers: { 'x-host-token': token || '' } }));
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [code, token]);

  useEffect(() => { load(); }, [load]);
  useRoomEvents(code, (type, payload) => {
    if (type === 'counts') setData((d) => (d ? { ...d, counts: payload } : d));
    load(); // keep player list / teams fresh
  });

  async function start() {
    setStarting(true);
    setError('');
    try {
      await api(`/rooms/${code}/start`, { method: 'POST', headers: { 'x-host-token': token } });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setStarting(false);
    }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(joinUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  }

  if (!token) {
    return (
      <Screen>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="text-6xl">🔒</div>
          <h1 className="mt-3 font-display text-3xl font-extrabold">Host screen</h1>
          <p className="mt-2 text-ink-soft">Only the device that created room <b>{code}</b> can control it.</p>
          <Button to={`/r/${code}`} className="mt-6">Join as a player instead</Button>
        </div>
      </Screen>
    );
  }
  if (!data) return error ? <Screen><ErrorNote>{error}</ErrorNote></Screen> : <Loading label="Opening your room…" />;

  const { room, counts, players, teams } = data;
  const grouped = room.status === 'grouped';
  const waitingOn = counts.joined - counts.answered;

  return (
    <Screen wide>
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold">🏝️ Find Your <span className="text-coral">Tribe</span></h1>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-ink-soft">
          {room.isTest ? 'TEST ROOM' : grouped ? 'Tribes formed' : 'Lobby open'}
        </span>
      </header>

      <div className={`mt-5 grid gap-5 ${grouped ? 'lg:grid-cols-[300px_1fr]' : 'md:grid-cols-[1fr_1fr]'}`}>
        <Card className="flex flex-col items-center text-center">
          <p className="font-display text-lg font-bold text-ink-soft">{grouped ? 'Late? Scan to join a tribe' : 'Scan to join'}</p>
          <div className="mt-3 rounded-2xl bg-white p-2 ring-4 ring-sand-deep">
            <QRCodeSVG value={joinUrl} size={grouped ? 180 : 240} level="M" marginSize={1} />
          </div>
          <p className="mt-3 text-sm font-semibold text-ink-soft">or go to <b className="break-all text-ink">{window.location.host}</b> and enter</p>
          <p className="font-display text-5xl font-extrabold tracking-[0.2em] text-coral">{code}</p>
          <button onClick={copy} className="mt-2 text-sm font-bold text-ink-soft underline underline-offset-4">
            {copied ? 'Link copied ✓' : 'Copy join link'}
          </button>
        </Card>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2">
            <Stat emoji="👋" value={counts.joined} label="Joined" />
            <Stat emoji="✅" value={counts.answered} label="Answered" />
            {grouped
              ? <Stat emoji="🎉" value={counts.challengeDone} label="Challenge done" />
              : <Stat emoji="⏳" value={waitingOn} label="Still answering" />}
          </div>

          {!grouped && (
            <Card>
              <h2 className="font-display text-xl font-bold">Explorers in the room</h2>
              {players.length === 0 ? (
                <p className="mt-2 text-ink-soft">Waiting for the first scan… 📱</p>
              ) : (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {players.map((p) => (
                    <li key={p.id} className={`anim-pop flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold ${p.answered ? 'bg-sea/15 text-ink' : 'bg-sand text-ink-soft'}`}>
                      <span className="text-lg">{p.avatar}</span>{p.nickname}{p.answered ? ' ✓' : ''}
                    </li>
                  ))}
                </ul>
              )}
              <Button className="mt-5" onClick={start} loading={starting} disabled={counts.answered < 2}>
                Form the tribes ({counts.answered} ready)
              </Button>
              <p className="mt-2 text-center text-xs font-semibold text-ink-soft">
                {counts.answered < 2
                  ? 'Needs at least 2 people who finished the questions.'
                  : waitingOn > 0
                    ? `${waitingOn} still answering — they'll be added to a tribe automatically when they finish.`
                    : 'Everyone is ready! 🚀'}
              </p>
              <ErrorNote>{error}</ErrorNote>
            </Card>
          )}

          {grouped && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {teams.map((t) => {
                  const ch = CHALLENGES.find((c) => c.id === t.challengeId);
                  return (
                    <div key={t.id} className="anim-pop rounded-3xl p-4 text-white shadow-lg" style={{ background: t.color }}>
                      <div className="flex items-center justify-between">
                        <h3 className="font-display text-xl font-extrabold">{t.emoji} {t.name}</h3>
                        <span className="rounded-full bg-white/25 px-2 py-0.5 text-xs font-bold">
                          {t.challengeCompletedAt ? 'Done ✓' : t.challengeStartedAt ? 'In challenge' : 'Finding each other'}
                        </span>
                      </div>
                      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-bold">
                        {t.members.map((m) => <span key={m.id}>{m.avatar} {m.nickname}</span>)}
                      </p>
                      {ch && <p className="mt-2 text-sm text-white/85">{ch.emoji} {ch.title}</p>}
                    </div>
                  );
                })}
              </div>
              <p className="text-center text-sm font-semibold text-ink-soft">
                {counts.feedback} of {counts.grouped} finished the whole experience. No need to manage anything — just watch the room come alive. 🎉
              </p>
              <ErrorNote>{error}</ErrorNote>
            </>
          )}
        </div>
      </div>
    </Screen>
  );
}

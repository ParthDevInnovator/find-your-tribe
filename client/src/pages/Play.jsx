import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { storage, playerKey } from '../lib/storage.js';
import { useRoomEvents } from '../lib/socket.js';
import { Screen, Button, Loading, ErrorNote } from '../components/ui.jsx';
import {
  JoinStep, QuestionsStep, WaitingStep, RevealStep, ChallengeStep, SummaryStep, FeedbackStep, DoneStep,
} from '../components/steps.jsx';

/**
 * The whole participant journey lives on /r/:code. What to show is derived
 * from the server-side status, so refreshes and locked phones resume cleanly.
 */
export default function Play() {
  const code = useParams().code.toUpperCase();
  const [token, setToken] = useState(() => storage.get(playerKey(code)));
  const [me, setMe] = useState(null);
  const [roomInfo, setRoomInfo] = useState(null);
  const [fatal, setFatal] = useState('');
  const [error, setError] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);

  const authed = useCallback(
    (path, opts = {}) => api(path, { ...opts, headers: { 'x-participant-token': token } }),
    [token],
  );

  const refresh = useCallback(async () => {
    if (!token) {
      try {
        setRoomInfo(await api(`/rooms/${code}`));
      } catch (e) {
        setFatal(e.status === 404 ? 'notfound' : e.message);
      }
      return;
    }
    try {
      const data = await authed('/me');
      if (data.room.code !== code) throw Object.assign(new Error('wrong room'), { status: 401 });
      setMe(data);
      setError('');
    } catch (e) {
      if (e.status === 401) {
        storage.remove(playerKey(code));
        setToken(null);
        setMe(null);
      } else {
        setError(e.message);
      }
    }
  }, [token, code, authed]);

  useEffect(() => { refresh(); }, [refresh]);

  useRoomEvents(code, (type, payload) => {
    if (type === 'counts') setMe((m) => (m ? { ...m, counts: payload } : m));
    else if (type === 'team') { if (me?.team?.id === payload.teamId || !me?.team) refresh(); }
    else refresh();
  });

  // Mutations return the fresh /me payload.
  const act = useCallback(async (path, body) => {
    setError('');
    try {
      setMe(await authed(path, { method: 'POST', body }));
      return true;
    } catch (e) {
      setError(e.message);
      if (e.status === 401) refresh();
      return false;
    }
  }, [authed, refresh]);

  function onJoined(newToken) {
    storage.set(playerKey(code), newToken);
    setToken(newToken);
  }

  if (fatal === 'notfound') {
    return (
      <Screen>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="text-7xl">🔎</div>
          <h1 className="mt-4 font-display text-3xl font-extrabold">Room {code} not found</h1>
          <p className="mt-2 text-ink-soft">Double-check the code with your host, or scan the QR again.</p>
          <Button to="/" className="mt-8">Back to start</Button>
        </div>
      </Screen>
    );
  }
  if (fatal) return <Screen><ErrorNote>{fatal}</ErrorNote></Screen>;

  if (!token) {
    if (!roomInfo) return <Loading label="Finding your room…" />;
    return <JoinStep code={code} roomInfo={roomInfo} onJoined={onJoined} />;
  }
  if (!me) return error ? <Screen><ErrorNote>{error}</ErrorNote><Button className="mt-4" onClick={refresh}>Try again</Button></Screen> : <Loading />;

  const { participant, team } = me;
  const common = { me, act, error };

  switch (participant.status) {
    case 'joined':
      return <QuestionsStep {...common} />;
    case 'answered':
      return <WaitingStep {...common} />;
    case 'grouped':
      return team ? <RevealStep {...common} /> : <WaitingStep {...common} />;
    case 'challenge_started':
      return <ChallengeStep {...common} />;
    case 'challenge_done':
      return showFeedback
        ? <FeedbackStep {...common} />
        : <SummaryStep {...common} onNext={() => setShowFeedback(true)} />;
    case 'feedback_done':
    default:
      return <DoneStep {...common} />;
  }
}

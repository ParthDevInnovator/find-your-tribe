import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { deviceId } from '../lib/storage.js';
import { Screen, Button, Card, ErrorNote, MemberList, Confetti } from './ui.jsx';
import { QUESTIONS, AVATARS, CHALLENGES } from '../../../shared/gameData.js';

/* ---------------- Join ---------------- */
export function JoinStep({ code, roomInfo, onJoined }) {
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState(() => AVATARS[Math.floor(Math.random() * AVATARS.length)]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!nickname.trim()) { setError('Pick a nickname — first name is perfect'); return; }
    setBusy(true);
    setError('');
    try {
      const { participantToken } = await api(`/rooms/${code}/join`, {
        method: 'POST', body: { nickname: nickname.trim(), avatar, deviceId: deviceId() },
      });
      onJoined(participantToken);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Screen>
      <div className="pt-4 text-center">
        <p className="font-display text-lg font-bold text-ink-soft">Room <span className="tracking-widest text-coral">{code}</span></p>
        <h1 className="font-display text-4xl font-extrabold leading-tight">Hey explorer! 👋</h1>
        <p className="mt-1 font-semibold text-ink-soft">
          {roomInfo.counts.joined > 0 ? `${roomInfo.counts.joined} already in the room.` : 'You’re the first one here!'} No signup needed.
        </p>
      </div>

      <form onSubmit={submit} className="mt-6 flex flex-1 flex-col">
        <Card>
          <label htmlFor="nick" className="font-display text-xl font-bold">What should we call you?</label>
          <input
            id="nick"
            value={nickname}
            onChange={(e) => { setNickname(e.target.value); setError(''); }}
            maxLength={20}
            placeholder="Your nickname"
            autoComplete="nickname"
            enterKeyHint="done"
            className="mt-3 w-full rounded-2xl border-2 border-sand-deep bg-sand px-4 py-3 text-xl font-bold outline-none focus:border-coral"
          />
          <p className="mt-5 font-display text-xl font-bold">Pick your avatar</p>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {AVATARS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAvatar(a)}
                aria-label={`Avatar ${a}`}
                aria-pressed={avatar === a}
                className={`aspect-square rounded-2xl text-3xl transition-transform ${avatar === a ? 'scale-110 bg-coral/15 ring-[3px] ring-coral' : 'bg-sand active:scale-90'}`}
              >
                {a}
              </button>
            ))}
          </div>
        </Card>
        {roomInfo.status === 'grouped' && (
          <p className="mt-3 rounded-xl bg-white/70 px-4 py-2 text-center text-sm font-semibold text-ink-soft">
            Tribes are already formed — answer 5 quick questions and we'll add you to the best fit.
          </p>
        )}
        <ErrorNote>{error}</ErrorNote>
        <Button type="submit" className="mt-5" loading={busy}>Let's go {avatar}</Button>
      </form>
    </Screen>
  );
}

/* ---------------- Questions ---------------- */
export function QuestionsStep({ act, error }) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [picked, setPicked] = useState(null);
  const [busy, setBusy] = useState(false);
  const q = QUESTIONS[idx];
  const done = answers.length === QUESTIONS.length && answers.every((a) => a !== undefined);

  async function submit(final) {
    setBusy(true);
    const ok = await act('/me/answers', { answers: final });
    if (!ok) setBusy(false);
  }

  function choose(oi) {
    if (picked !== null || busy) return;
    setPicked(oi);
    const next = answers.slice();
    next[idx] = oi;
    setAnswers(next);
    setTimeout(() => {
      setPicked(null);
      if (idx < QUESTIONS.length - 1) setIdx(idx + 1);
      else submit(next);
    }, 320);
  }

  return (
    <Screen>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0 || busy}
          className="grid h-11 w-11 place-items-center rounded-full bg-white text-xl font-bold shadow-sm disabled:opacity-30"
          aria-label="Previous question"
        >←</button>
        <div className="flex flex-1 gap-1.5" aria-label={`Question ${idx + 1} of ${QUESTIONS.length}`}>
          {QUESTIONS.map((_, i) => (
            <span key={i} className={`h-2.5 flex-1 rounded-full transition-colors ${i < idx || (i === idx && picked !== null) ? 'bg-coral' : i === idx ? 'bg-coral/40' : 'bg-white'}`} />
          ))}
        </div>
        <span className="w-11 text-right font-display text-lg font-bold text-ink-soft">{idx + 1}/5</span>
      </div>

      <div key={idx} className="anim-rise mt-8 flex flex-1 flex-col">
        <div className="text-5xl">{q.emoji}</div>
        <h1 className="mt-2 font-display text-[28px] font-extrabold leading-tight">{q.text}</h1>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {q.options.map((o, oi) => {
            const selected = picked === oi || (picked === null && answers[idx] === oi);
            return (
              <button
                key={o.label}
                type="button"
                onClick={() => choose(oi)}
                className={`flex min-h-36 flex-col items-center justify-center gap-2 rounded-3xl p-3 text-center font-bold shadow-sm transition-all duration-150 ${selected ? 'scale-[1.03] bg-coral text-white shadow-lg' : 'bg-white active:scale-95'}`}
              >
                <span className={`text-5xl ${picked === oi ? 'anim-pop' : ''}`}>{o.emoji}</span>
                <span className="text-[15px] leading-tight">{o.label}</span>
              </button>
            );
          })}
        </div>
        {busy && <p className="mt-6 text-center font-semibold text-ink-soft">Saving your vibe… ✨</p>}
        <ErrorNote>{error}</ErrorNote>
        {error && done && <Button className="mt-4" onClick={() => submit(answers)} loading={busy}>Try again</Button>}
      </div>
    </Screen>
  );
}

/* ---------------- Waiting room ---------------- */
const FLOATERS = ['🏖️', '🏔️', '🍕', '🎒', '☕', '🗺️'];

export function WaitingStep({ me }) {
  const { counts, participant, room } = me;
  const still = Math.max(0, counts.joined - counts.answered);
  return (
    <Screen>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="relative">
          <div className="anim-pulse grid h-32 w-32 place-items-center rounded-full bg-white text-7xl shadow-lg">{participant.avatar}</div>
        </div>
        <h1 className="mt-6 font-display text-4xl font-extrabold leading-tight">
          {counts.joined} explorer{counts.joined === 1 ? ' has' : 's have'} joined!
        </h1>
        <p className="mt-2 text-lg font-semibold text-ink-soft">
          {room.status === 'grouped'
            ? 'Finding the perfect tribe for you…'
            : still > 0
              ? `Waiting for ${still} more to finish. The host will start soon.`
              : 'Everyone is ready — waiting for the host to form the tribes!'}
        </p>
        <div className="mt-6 flex gap-3 text-3xl">
          {FLOATERS.map((e, i) => <span key={e} className="anim-float" style={{ animationDelay: `${i * 0.2}s` }}>{e}</span>)}
        </div>
        <Card className="mt-8 w-full text-left">
          <p className="font-display text-lg font-bold">While you wait 👀</p>
          <p className="text-ink-soft">Look around the room — who do you think will be in your tribe?</p>
        </Card>
      </div>
    </Screen>
  );
}

/* ---------------- Tribe reveal ---------------- */
export function RevealStep({ me, act, error }) {
  const { team } = me;
  const [busy, setBusy] = useState(false);
  const mates = team.members.filter((m) => !m.isMe);
  return (
    <Screen light className="text-white" style={{ background: `radial-gradient(120% 70% at 50% 0%, rgb(255 255 255 / 0.25), transparent 60%), ${team.color}` }}>
      <Confetti />
      <div className="flex flex-1 flex-col pt-4 text-center">
        <p className="anim-rise font-display text-lg font-bold text-white/85">You found your tribe!</p>
        <div className="anim-pop mt-2 text-[96px] leading-none" style={{ animationDelay: '.15s' }}>{team.emoji}</div>
        <h1 className="anim-rise mt-2 font-display text-4xl font-extrabold leading-tight" style={{ animationDelay: '.3s' }}>
          Welcome to the {team.name}!
        </h1>
        <p className="anim-rise mx-auto mt-3 max-w-sm text-lg font-semibold text-white/90" style={{ animationDelay: '.4s' }}>
          “{team.connection}”
        </p>

        <div className="mt-6 text-left">
          <p className="mb-2 font-display text-lg font-bold text-white/85">Your teammates</p>
          <MemberList members={[...mates, ...team.members.filter((m) => m.isMe)]} light />
        </div>

        <div className="anim-rise mt-6 rounded-3xl bg-white p-5 text-ink" style={{ animationDelay: `${0.7 + team.members.length * 0.15}s` }}>
          <p className="font-display text-sm font-bold uppercase tracking-wider" style={{ color: team.color }}>Your first mission</p>
          <p className="mt-1 font-display text-2xl font-extrabold leading-tight">
            Find {mates.length === 1 ? mates[0].nickname : 'your teammates'} in the room and say hello! 👋
          </p>
          <p className="mt-1 text-sm font-semibold text-ink-soft">Hold up your phone — your screens are the same color.</p>
        </div>

        <ErrorNote>{error}</ErrorNote>
        <Button variant="white" className="mt-6" loading={busy} onClick={async () => { setBusy(true); if (!(await act('/me/challenge/start'))) setBusy(false); }}>
          We found each other! →
        </Button>
      </div>
    </Screen>
  );
}

/* ---------------- Challenge ---------------- */
const CHALLENGE_SECONDS = 180;

function useCountdown(startIso) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const start = startIso ? new Date(startIso).getTime() : now;
  return Math.max(0, CHALLENGE_SECONDS - Math.floor((now - start) / 1000));
}

export function ChallengeStep({ me, act, error }) {
  const { team } = me;
  const ch = CHALLENGES.find((c) => c.id === team.challengeId) ?? CHALLENGES[0];
  const left = useCountdown(team.challengeStartedAt);
  const [busy, setBusy] = useState(false);
  const mm = String(Math.floor(left / 60));
  const ss = String(left % 60).padStart(2, '0');

  return (
    <Screen>
      <div className="flex items-center justify-between rounded-2xl px-4 py-3 text-white" style={{ background: team.color }}>
        <span className="font-display text-lg font-extrabold">{team.emoji} {team.name}</span>
        <span className="flex -space-x-1 text-2xl">{team.members.map((m) => <span key={m.id}>{m.avatar}</span>)}</span>
      </div>

      <div className="flex flex-1 flex-col pt-6">
        <p className="font-display text-sm font-bold uppercase tracking-wider text-coral">Your tribe challenge</p>
        <Card className="anim-pop mt-2 text-center">
          <div className="text-7xl">{ch.emoji}</div>
          <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight">{ch.title}</h1>
          <p className="mt-3 text-lg font-semibold">{ch.text}</p>
          <p className="mt-3 rounded-2xl bg-sand px-4 py-3 font-bold">👉 {ch.rule}</p>
        </Card>

        <div className="mt-6 text-center" aria-live="polite">
          <p className={`font-display text-5xl font-extrabold tabular-nums ${left === 0 ? 'text-coral' : ''}`}>{mm}:{ss}</p>
          <p className="font-semibold text-ink-soft">
            {left === 0 ? "Time's up — wrap it up and celebrate!" : 'About 3 minutes. Everyone takes a turn!'}
          </p>
        </div>

        <div className="mt-auto pt-6">
          <ErrorNote>{error}</ErrorNote>
          <Button className="mt-3" loading={busy} onClick={async () => { setBusy(true); if (!(await act('/me/challenge/complete'))) setBusy(false); }}>
            We did it! 🎉
          </Button>
          <p className="mt-2 text-center text-xs font-semibold text-ink-soft">Only one of you needs to tap this.</p>
        </div>
      </div>
    </Screen>
  );
}

/* ---------------- Final tribe reveal ---------------- */
export function SummaryStep({ me, onNext }) {
  const { team } = me;
  return (
    <Screen>
      <Confetti count={36} />
      <div className="flex flex-1 flex-col pt-4">
        <div className="text-center">
          <div className="anim-pop text-7xl">🎉</div>
          <h1 className="mt-2 font-display text-4xl font-extrabold leading-tight">You Found Your Tribe!</h1>
        </div>

        <Card className="mt-6 overflow-hidden p-0">
          <div className="px-5 py-4 text-white" style={{ background: team.color }}>
            <p className="text-sm font-bold text-white/80">Team</p>
            <p className="font-display text-3xl font-extrabold">{team.emoji} {team.name}</p>
          </div>
          <div className="p-5">
            <p className="font-display text-lg font-bold">Your teammates</p>
            <div className="mt-2"><MemberList members={team.members} /></div>
            <p className="mt-5 font-display text-lg font-bold">What connects you</p>
            <p className="mt-1 text-lg font-semibold text-ink-soft">“{team.connection}”</p>
          </div>
        </Card>

        <div className="mt-4 rounded-3xl bg-ink p-5 text-white">
          <p className="font-display text-sm font-bold uppercase tracking-wider text-[#FFC53D]">Keep the conversation going</p>
          <p className="mt-1 font-display text-2xl font-bold leading-snug">{team.starter}</p>
        </div>

        <Button className="mt-6" onClick={onNext}>Quick feedback (10 sec) →</Button>
      </div>
    </Screen>
  );
}

/* ---------------- Feedback ---------------- */
function Choice({ options, value, onChange }) {
  return (
    <div className="mt-3 flex gap-2">
      {options.map(([v, label]) => (
        <button
          key={label}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          className={`min-h-14 flex-1 rounded-2xl font-display text-lg font-bold transition-all ${value === v ? 'bg-coral text-white shadow-md' : 'bg-sand active:scale-95'}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function FeedbackStep({ act, error }) {
  const [talkedToNew, setTalked] = useState(null);
  const [wouldRepeat, setRepeat] = useState(null);
  const [busy, setBusy] = useState(false);
  const ready = talkedToNew !== null && wouldRepeat !== null;

  return (
    <Screen>
      <div className="flex flex-1 flex-col pt-6">
        <h1 className="font-display text-4xl font-extrabold">Two quick ones 🙏</h1>
        <p className="mt-1 font-semibold text-ink-soft">Help us make this better.</p>
        <Card className="mt-6">
          <p className="font-display text-xl font-bold leading-snug">Did this experience help you talk to someone new?</p>
          <Choice options={[[true, 'Yes 🙌'], [false, 'No']]} value={talkedToNew} onChange={setTalked} />
        </Card>
        <Card className="mt-4">
          <p className="font-display text-xl font-bold leading-snug">Would you enjoy another activity with your teammates?</p>
          <Choice options={[['yes', 'Yes'], ['maybe', 'Maybe'], ['no', 'No']]} value={wouldRepeat} onChange={setRepeat} />
        </Card>
        <ErrorNote>{error}</ErrorNote>
        <Button
          className="mt-6"
          disabled={!ready}
          loading={busy}
          onClick={async () => { setBusy(true); if (!(await act('/me/feedback', { talkedToNew, wouldRepeat }))) setBusy(false); }}
        >
          Submit
        </Button>
      </div>
    </Screen>
  );
}

/* ---------------- Done ---------------- */
export function DoneStep({ me }) {
  const { team } = me;
  return (
    <Screen light className="text-white" style={{ background: team?.color ?? 'var(--color-coral)' }}>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="anim-pop text-8xl">{team?.emoji ?? '🎉'}</div>
        <h1 className="anim-rise mt-4 font-display text-4xl font-extrabold leading-tight">🎉 Your tribe is waiting!</h1>
        <p className="anim-rise mt-3 max-w-xs text-xl font-semibold text-white/90" style={{ animationDelay: '.15s' }}>
          Put your phone away and keep the conversation going.
        </p>
        {team && (
          <p className="anim-rise mt-8 rounded-2xl bg-white/20 px-4 py-3 font-bold" style={{ animationDelay: '.3s' }}>
            {team.members.map((m) => `${m.avatar} ${m.nickname}`).join('   ')}
          </p>
        )}
      </div>
    </Screen>
  );
}

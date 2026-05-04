import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { isAllowedEmail, getAllowedUser } from '../utils/access';
import collegeLogo from '../assets/college-logo.jpeg';
import {
  type SceneMode,
  type ActiveScene,
  cycleScene,
  getActiveScene,
  getSceneLabel,
} from '../utils/sceneTheme';

interface LoginPageProps {
  onLoginSuccess: (user: any) => void;
  forcedError?: string;
  sceneMode: SceneMode;
  onSceneModeChange: (mode: SceneMode) => void;
}
type DialogueKind = 'sun' | 'moon' | 'star';

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
export function LoginPage({
  onLoginSuccess,
  forcedError,
  sceneMode,
  onSceneModeChange,
}: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [dialogue, setDialogue] = useState<{
    kind: DialogueKind;
    text: string;
  } | null>(null);
  const dialogueTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (forcedError) {
      setError(forcedError);
    }
  }, [forcedError]);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const interval = window.setInterval(tick, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      if (dialogueTimerRef.current !== null) {
        window.clearTimeout(dialogueTimerRef.current);
      }
    };
  }, []);

  const activeScene: ActiveScene = getActiveScene(sceneMode, now);
  const isNight = activeScene === 'night';
  const isMorning = activeScene === 'morning';
  const isAfternoon = activeScene === 'afternoon';
  const isEvening = activeScene === 'evening';

  const hour = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  const dayProgress = clamp((hour - 6) / 12, 0, 1);
  const nightProgress = hour >= 18 ? clamp((hour - 18) / 12, 0, 1) : clamp((hour + 6) / 12, 0, 1);

  const skyTone = {
    morning: 'linear-gradient(135deg, #6f8ff3 0%, #8d5bd2 52%, #6b3d97 100%)',
    afternoon: 'linear-gradient(135deg, #ffcb67 0%, #ff9f53 45%, #e77b5e 100%)',
    evening: 'linear-gradient(135deg, #ff9f6d 0%, #ef6d4a 42%, #53366f 100%)',
    night: 'linear-gradient(135deg, #081120 0%, #121d38 52%, #050814 100%)',
  }[activeScene];

  const rightTone = {
    morning: '#f8f9ff',
    afternoon: '#fff6ea',
    evening: '#f7efe6',
    night: '#0b1020',
  }[activeScene];

  const panelBorder = isNight ? 'rgba(148, 163, 184, 0.12)' : 'rgba(148, 163, 184, 0.18)';
  const cardTone = isNight ? 'rgba(15, 23, 42, 0.78)' : 'rgba(255, 255, 255, 0.86)';
  const textTone = isNight ? '#e5e7eb' : '#2f3440';
  const mutedTone = isNight ? '#a7b1c2' : '#6b7280';

  const leftHeading = {
    morning: 'Good Morning',
    afternoon: 'Good Afternoon',
    evening: 'Good Evening',
    night: 'Good Night',
  }[activeScene];

  const leftCopy = {
    morning: 'Login your account to get full user Experience',
    afternoon: 'The day is moving, and so is the work waiting for you',
    evening: 'Sunset mode engaged. Log in before the stars take over',
    night: "It's late user hope you will complete the work quick and sleep early",
  }[activeScene];

  const bodyGlow = isNight
    ? '0 0 28px rgba(255, 255, 255, 0.18)'
    : isAfternoon
      ? '0 0 38px rgba(255, 176, 66, 0.55)'
      : isEvening
        ? '0 0 34px rgba(255, 121, 72, 0.45)'
        : '0 0 40px rgba(255, 215, 0, 0.55)';

  const sunPosition = {
    x: 12 + dayProgress * 68,
    y: 72 - Math.sin(dayProgress * Math.PI) * 48,
  };

  const moonPosition = {
    x: 18 + nightProgress * 56,
    y: 24 + Math.sin(nightProgress * Math.PI) * 8,
  };

  const sunDialogues = [
    'You dare disturb my glorious peace, mortal?',
    'Careful... even your shadow would burn near me.',
    'I am not just a star. I am the ruler of the heavens.',
    'One more step and I shall reduce your kingdom to ash.',
    'You call that courage? I call it stupidity.',
    'The Moon may charm you, but I command fear.',
    'Do not mistake my warmth for kindness.',
    'Ah, another tiny mortal mesmerized by true greatness.',
    'Even the stars bow when I awaken.',
    'Touch me again and I shall summon a solar apocalypse.',
    'I shine brighter than your future.',
    'Your tiny cursor cannot challenge me.',
    'Do you know how many worlds depend on my power?',
    'The Moon hides in darkness. I own the sky.',
    'Bow, mortal. The king of the cosmos is watching.',
    'I could end your entire existence before you blink.',
    'You survive only because I allow it.',
    'Do not anger me. Even planets fear my wrath.',
    'I was ancient before your species learned to crawl.',
    'The mighty Sun does not forgive.',
  ];

  const moonDialogues = [
    'Omg 😱 Sun! Save me dear, this mortal is touching me!',
    'Hm 😾 I am the elegant Empress of the night sky.',
    'Do not stare too long... you may fall in love.',
    'How dare you approach me without permission?',
    'The stars! Protect your Empress at once!',
    'I may be gentle... but I can still ruin you.',
    'The Sun is loud. I am simply superior.',
    'You wish to touch perfection? How adorable.',
    'One more move and I shall curse your dreams.',
    'Even the oceans obey my command.',
    'You are lucky I find mortals amusing.',
    'The stars whisper about you, you know.',
    'I shine softly because true power does not need to scream.',
    'Sun! This peasant is bothering me again!',
    'You may admire me from afar. That is enough.',
    'I am beauty, mystery, and danger all at once.',
    'Touch me again and Orion himself shall hunt you.',
    'You look at me like you have never seen a goddess before.',
    'I do not chase attention. Attention chases me.',
    'Ah... another mortal enchanted by my moonlight.',
  ];

  const starDialogues = [
    'Yes, your Empress!',
    'Protect Lady Moon!',
    'Fear the wrath of Orion!',
    'The Sun has been informed!',
    'Intruder detected near Lady Moon!',
    'Deploy constellation formation!',
    'For the glory of the night sky!',
    'We stand with the Empress!',
    'Mortal detected. Threat level rising.',
    'Shall we strike, my Empress?',
    'The heavens are watching.',
    'No one touches our queen.',
    'Orion formation ready!',
    'The mighty Sun shall avenge this insult.',
    'Lady Moon, stand back!',
    'The stars obey your command.',
    'We have the mortal surrounded.',
    'Warning! Unauthorized touching detected.',
    'The kingdom of the night shall not fall.',
    'For the Empress! Attack! ✨',
  ];

  const pickRandom = (items: string[]) => items[Math.floor(Math.random() * items.length)];

  const orionStars = [
    { id: 'betelgeuse', x: 72, y: 16, size: 12, delay: '0ms' },
    { id: 'bellatrix', x: 80, y: 22, size: 8, delay: '120ms' },
    { id: 'mintaka', x: 87, y: 29, size: 9, delay: '240ms' },
    { id: 'alnilam', x: 77.5, y: 31, size: 7, delay: '360ms' },
    { id: 'alnitak', x: 68.5, y: 31, size: 7, delay: '480ms' },
    { id: 'rigel', x: 76, y: 43, size: 11, delay: '600ms' },
    { id: 'saiph', x: 83, y: 49, size: 8, delay: '720ms' },
  ];

  const constellationLines = [
    { x1: 72.2, y1: 16.2, x2: 80, y2: 22 },
    { x1: 80, y1: 22, x2: 87, y2: 29 },
    { x1: 68.5, y1: 31, x2: 77.5, y2: 31 },
    { x1: 77.5, y1: 31, x2: 87, y2: 29 },
    { x1: 77.5, y1: 31, x2: 76, y2: 43 },
    { x1: 76, y1: 43, x2: 83, y2: 49 },
  ];

  const handleBodyInteraction = (kind: DialogueKind) => {
    if (dialogueTimerRef.current !== null) {
      window.clearTimeout(dialogueTimerRef.current);
    }

    if (kind === 'sun') {
      setDialogue({ kind, text: pickRandom(sunDialogues) });
    } else if (kind === 'moon') {
      setDialogue({ kind, text: pickRandom(moonDialogues) });
    } else {
      setDialogue({ kind, text: pickRandom(starDialogues) });
    }

    dialogueTimerRef.current = window.setTimeout(() => {
      setDialogue(null);
      dialogueTimerRef.current = null;
    }, kind === 'star' ? 2400 : 3400);
  };

  const clearDialogue = () => {
    if (dialogueTimerRef.current !== null) {
      window.clearTimeout(dialogueTimerRef.current);
      dialogueTimerRef.current = null;
    }
    setDialogue(null);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!isAllowedEmail(email)) {
        setError('This email is not authorized for access.');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      if (data?.session?.access_token) {
        const allowed = getAllowedUser(email);
        onLoginSuccess({
          id: data.user.id,
          email: data.user.email,
          name: allowed?.name || data.user.user_metadata?.name || data.user.email?.split('@')[0],
          accessToken: data.session.access_token,
          role: allowed?.role || 'staff',
          department: allowed?.department || 'CSE',
        });
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: skyTone }}>
      <style>{`
        @keyframes slideInUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideInRight {
          0% { opacity: 0; transform: translateX(-30px); }
          100% { opacity: 1; transform: translateX(0); }
        }

        @keyframes fadeInScale {
          0% { opacity: 0; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }

        @keyframes revealField {
          0% { opacity: 0; transform: translateY(8px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }

        @keyframes twinkle {
          0%, 100% { opacity: 0.65; transform: scale(0.95); }
          50% { opacity: 1; transform: scale(1.1); }
        }

        @keyframes drift {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(8px); }
        }

        .scene-layer {
          position: absolute;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          transition: background 500ms ease, filter 500ms ease;
        }

        .sky-body {
          width: 128px;
          height: 128px;
          border-radius: 999px;
          position: absolute;
          transform: translate(-50%, -50%);
          animation: float 6s ease-in-out infinite;
          transition: left 650ms cubic-bezier(0.22, 1, 0.36, 1), top 650ms cubic-bezier(0.22, 1, 0.36, 1), background 500ms ease, box-shadow 500ms ease;
        }

        .moon-crater {
          position: absolute;
          border-radius: 999px;
          background: rgba(148, 163, 184, 0.48);
        }

        .cloud {
          position: absolute;
          background: rgba(255, 255, 255, 0.12);
          border-radius: 999px;
          filter: blur(0.2px);
        }

        .cloud-1 {
          width: 120px;
          height: 50px;
          top: 30%;
          left: 5%;
          animation: drift 9s ease-in-out infinite;
        }

        .cloud-2 {
          width: 104px;
          height: 42px;
          bottom: 24%;
          right: 10%;
          animation: drift 10s ease-in-out infinite 1.2s;
        }

        .cloud-3 {
          width: 150px;
          height: 56px;
          bottom: 10%;
          left: 14%;
          animation: drift 11s ease-in-out infinite 2.4s;
        }

        .hill-1 {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 320px;
          height: 210px;
          background: rgba(94, 60, 135, 0.5);
          border-radius: 50% 50% 0 0;
        }

        .hill-2 {
          position: absolute;
          bottom: 24px;
          right: -48px;
          width: 370px;
          height: 230px;
          background: rgba(102, 126, 234, 0.28);
          border-radius: 50% 50% 0 0;
        }

        .night-stars {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .night-star {
          position: absolute;
          color: white;
          text-shadow: 0 0 8px rgba(255, 255, 255, 0.55);
          animation: twinkle 3.8s ease-in-out infinite;
          pointer-events: auto;
          background: transparent;
          border: none;
          padding: 0;
          line-height: 1;
        }

        .constellation-line {
          position: absolute;
          height: 1px;
          background: rgba(255, 255, 255, 0.22);
          transform-origin: left center;
        }

        .dialogue-bubble {
          position: absolute;
          min-width: 180px;
          max-width: 240px;
          padding: 10px 12px;
          border-radius: 16px;
          background: rgba(8, 15, 30, 0.88);
          color: white;
          font-size: 12px;
          line-height: 1.5;
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.22);
          backdrop-filter: blur(8px);
          z-index: 20;
          pointer-events: none;
        }

        .dialogue-bubble::after {
          content: '';
          position: absolute;
          width: 10px;
          height: 10px;
          background: inherit;
          border-left: 1px solid rgba(255, 255, 255, 0.12);
          border-bottom: 1px solid rgba(255, 255, 255, 0.12);
          transform: rotate(45deg);
          bottom: -5px;
          left: 20px;
        }

        .form-container {
          width: 100%;
          max-width: 440px;
          color: ${textTone};
          background: ${isNight ? 'rgba(9, 15, 28, 0.42)' : 'rgba(255, 255, 255, 0.22)'};
          border: 1px solid ${panelBorder};
          border-radius: 30px;
          padding: 28px 30px 30px;
          box-shadow: 0 24px 50px rgba(15, 23, 42, 0.12);
          backdrop-filter: blur(18px);
        }

        .login-brand {
          width: 180px;
          max-width: 100%;
          height: auto;
          object-fit: contain;
          display: block;
          margin: 0 auto 18px;
        }

        .greeting {
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin-bottom: 5px;
          animation: slideInRight 500ms ease-out;
        }

        .greeting-desc {
          font-size: 14px;
          color: ${mutedTone};
          margin-bottom: 24px;
          animation: slideInRight 500ms ease-out 100ms both;
          text-align: center;
        }

        .form-group {
          margin-bottom: 18px;
        }

        .form-label {
          font-size: 13px;
          color: ${mutedTone};
          margin-bottom: 8px;
          display: block;
          font-weight: 500;
        }

        .form-input {
          width: 100%;
          padding: 12px 15px;
          border: 1px solid ${isNight ? 'rgba(148, 163, 184, 0.22)' : '#ddd'};
          border-radius: 10px;
          font-size: 14px;
          outline: none;
          transition: all 0.3s;
          background: ${isNight ? 'rgba(15, 23, 42, 0.66)' : 'white'};
          color: ${textTone};
        }

        .form-input::placeholder {
          color: ${isNight ? '#93a0b3' : '#9ca3af'};
        }

        .form-input:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.14);
        }

        .login-btn {
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #5a74ff 0%, #7c4dff 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 700;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s;
          margin-top: 20px;
          box-shadow: 0 10px 24px rgba(90, 116, 255, 0.24);
        }

        .login-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 28px rgba(90, 116, 255, 0.3);
        }

        .login-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .password-field {
          position: relative;
          width: 100%;
        }

        .password-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          border: 0;
          background: transparent;
          color: #6b7280;
          transition: color 0.2s ease;
        }

        .password-toggle:hover {
          color: #374151;
        }

        .scene-toggle {
          position: fixed;
          right: 18px;
          bottom: 18px;
          z-index: 30;
          padding: 10px 14px;
          border: none;
          border-radius: 999px;
          background: rgba(17, 24, 39, 0.9);
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.22);
          cursor: pointer;
          backdrop-filter: blur(12px);
          transition: transform 0.2s ease, background 0.2s ease;
        }

        .scene-toggle:hover {
          transform: translateY(-1px);
          background: rgba(17, 24, 39, 0.98);
        }

        @media (max-width: 960px) {
          .form-container {
            padding: 24px 20px 24px;
          }

          .login-brand {
            width: 160px;
          }
        }

        @media (max-width: 640px) {
          .form-container {
            max-width: min(100%, 360px);
            padding: 20px 16px 18px;
            border-radius: 24px;
            backdrop-filter: blur(14px);
          }

          .login-brand {
            width: 124px;
            margin-bottom: 14px;
          }

          .greeting {
            font-size: 20px;
          }

          .greeting-desc {
            font-size: 13px;
            margin-bottom: 18px;
          }

          .form-group {
            margin-bottom: 14px;
          }

          .form-label {
            font-size: 12px;
            margin-bottom: 6px;
          }

          .form-input {
            padding: 11px 12px;
            font-size: 13px;
          }

          .login-btn {
            padding: 11px;
            font-size: 14px;
            margin-top: 14px;
          }

          .sky-body {
            width: 88px;
            height: 88px;
          }

          .cloud-1,
          .cloud-2,
          .cloud-3,
          .hill-1,
          .hill-2 {
            opacity: 0.38;
          }

          .night-star {
            font-size: 10px !important;
          }

          .dialogue-bubble {
            min-width: 140px;
            max-width: 170px;
            font-size: 11px;
            padding: 8px 10px;
          }

          .scene-toggle {
            right: 12px;
            bottom: 12px;
            padding: 8px 12px;
            font-size: 11px;
          }
        }
      `}</style>

      <div
        className="scene-layer"
        style={{
          filter: isNight ? 'saturate(0.95) brightness(0.92)' : 'none',
          pointerEvents: 'auto',
        }}
      >
        {!isNight ? null : (
          <div className="night-stars">
            {constellationLines.map((line, index) => (
              <div
                key={`${line.x1}-${line.y1}-${line.x2}-${line.y2}`}
                className="constellation-line"
                style={{
                  left: `${line.x1}%`,
                  top: `${line.y1}%`,
                  width: `${Math.hypot(line.x2 - line.x1, line.y2 - line.y1)}%`,
                  transform: `rotate(${Math.atan2(line.y2 - line.y1, line.x2 - line.x1)}rad)`,
                }}
              />
            ))}

            {orionStars.map((star) => (
              <button
                key={star.id}
                type="button"
                className="night-star"
                style={{
                  left: `${star.x}%`,
                  top: `${star.y}%`,
                  fontSize: `${star.size}px`,
                  animationDelay: star.delay,
                }}
                onMouseEnter={() => handleBodyInteraction('star')}
                onFocus={() => handleBodyInteraction('star')}
                onClick={() => handleBodyInteraction('star')}
                aria-label="Star"
              >
                ✨
              </button>
            ))}
          </div>
        )}

        {isNight ? (
          <button
            type="button"
            className="sky-body"
            style={{
              left: `${moonPosition.x}%`,
              top: `${moonPosition.y}%`,
              background: '#f8fafc',
              boxShadow: bodyGlow,
            }}
            onMouseEnter={() => handleBodyInteraction('moon')}
            onFocus={() => handleBodyInteraction('moon')}
            onClick={() => handleBodyInteraction('moon')}
            aria-label="Moon"
          >
            <span
              className="moon-crater"
              style={{ width: 18, height: 18, top: 28, left: 28 }}
            />
            <span
              className="moon-crater"
              style={{ width: 11, height: 11, top: 58, left: 46 }}
            />
            <span
              className="moon-crater"
              style={{ width: 14, height: 14, top: 74, left: 22 }}
            />
            <span
              className="moon-crater"
              style={{ width: 8, height: 8, top: 42, left: 72 }}
            />
          </button>
        ) : (
          <button
            type="button"
            className="sky-body"
            style={{
              left: `${sunPosition.x}%`,
              top: `${sunPosition.y}%`,
              background: isAfternoon ? '#ffb932' : isEvening ? '#ff9e57' : '#ffd700',
              boxShadow: bodyGlow,
            }}
            onMouseEnter={() => handleBodyInteraction('sun')}
            onFocus={() => handleBodyInteraction('sun')}
            onClick={() => handleBodyInteraction('sun')}
            aria-label="Sun"
          />
        )}

        {dialogue ? (
          <div
          className="dialogue-bubble"
          style={{
            left:
              dialogue.kind === 'sun'
                  ? `${clamp(sunPosition.x + 4, 6, 72)}%`
                  : dialogue.kind === 'moon'
                    ? `${clamp(moonPosition.x - 8, 8, 70)}%`
                    : '70%',
            top:
              dialogue.kind === 'sun'
                  ? `${clamp(sunPosition.y + 12, 8, 82)}%`
                  : dialogue.kind === 'moon'
                    ? `${clamp(moonPosition.y + 12, 8, 82)}%`
                    : '20%',
            background:
              dialogue.kind === 'sun'
                ? 'linear-gradient(180deg, rgba(255, 241, 188, 0.96) 0%, rgba(255, 223, 126, 0.96) 100%)'
                : dialogue.kind === 'moon'
                  ? 'linear-gradient(180deg, rgba(233, 220, 255, 0.96) 0%, rgba(190, 166, 255, 0.96) 100%)'
                  : 'linear-gradient(180deg, rgba(126, 92, 176, 0.96) 0%, rgba(67, 46, 102, 0.96) 100%)',
            color:
              dialogue.kind === 'sun'
                ? '#6b3f0e'
                : dialogue.kind === 'moon'
                  ? '#4b3b72'
                  : '#fff',
          }}
        >
          {dialogue.text}
        </div>
        ) : null}

        <div className="cloud cloud-1" />
        <div className="cloud cloud-2" />
        <div className="cloud cloud-3" />
        <div className="hill-1" />
        <div className="hill-2" />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-10">
        <div className="form-container relative z-20 pointer-events-auto" style={{ animation: 'slideInUp 600ms ease-out' }}>
          <img src={collegeLogo} alt="College logo" className="login-brand" />

          <h2 className="greeting" style={{ color: textTone, textAlign: 'center' }}>
            Hello!
          </h2>
          <p className="greeting-desc">Login your account</p>

          {error ? (
            <div
              className="mb-4 p-3 rounded-lg bg-red-50 border-l-4 border-red-500 text-red-700 text-sm"
              style={{ animation: 'slideInUp 300ms ease-out' }}
            >
              {error}
            </div>
          ) : null}

          <form onSubmit={handleEmailLogin} autoComplete="on">
            <div
              className="form-group"
              style={{ animation: 'slideInUp 500ms ease-out 100ms both' }}
            >
              <label className="form-label">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="Enter your email"
                required
              />
            </div>

            {email.trim().length > 0 ? (
              <div className="form-group" style={{ animation: 'revealField 240ms ease-out both' }}>
                <label className="form-label">Password</label>
                <div className="password-field">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input pr-12"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="password-toggle"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ) : null}

            {email.trim().length > 0 && password.trim().length > 0 ? (
              <button
                type="submit"
                disabled={loading}
                className="login-btn"
                style={{ animation: 'revealField 240ms ease-out both' }}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin h-5 w-5 mr-2"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Login'
                )}
              </button>
            ) : null}
          </form>
        </div>
      </div>

      <button
        type="button"
        className="scene-toggle"
        onClick={() => {
          clearDialogue();
          onSceneModeChange(cycleScene(sceneMode));
        }}
      >
        {getSceneLabel(sceneMode, now)}
      </button>
    </div>
  );
}

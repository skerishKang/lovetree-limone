import { useEffect, useRef, useState } from 'react';

const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260530_042513_df96a13b-6155-4f6e-8b93-c9dee66fba08.mp4';

const TYPEWRITER_TEXT =
  '처음 마음이 멈춘 순간을 심어보세요. 그때의 감정과, 왜 다음 순간으로 이어졌는지까지. 사랑이 자라온 길을 한 그루의 나무로 남깁니다.';

const navItems = ['둘러보기', '내 러브트리', '이야기', '가이드'];

function useTypewriter(text: string, speed = 38, startDelay = 600) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);

    let intervalId: number | undefined;
    const timeoutId = window.setTimeout(() => {
      let index = 0;
      intervalId = window.setInterval(() => {
        index += 1;
        setDisplayed(text.slice(0, index));
        if (index >= text.length) {
          if (intervalId) window.clearInterval(intervalId);
          setDone(true);
        }
      }, speed);
    }, startDelay);

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [text, speed, startDelay]);

  return { displayed, done };
}

function CopyIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      className="h-3 w-3 shrink-0"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="1.25" y="1.25" width="6.5" height="6.5" rx="1" stroke="currentColor" strokeWidth="1" />
      <rect x="4.25" y="4.25" width="6.5" height="6.5" rx="1" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const prevXRef = useRef<number | null>(null);
  const targetTimeRef = useRef(0);
  const seekingRef = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const { displayed, done } = useTypewriter(TYPEWRITER_TEXT);

  useEffect(() => {
    const timer = window.setTimeout(() => setActionsVisible(true), 400);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const SENSITIVITY = 0.8;

    const seekTowardTarget = () => {
      if (!video.duration || Number.isNaN(video.duration) || seekingRef.current) return;
      const desired = Math.max(0, Math.min(targetTimeRef.current, video.duration));
      if (Math.abs(video.currentTime - desired) < 0.01) return;
      seekingRef.current = true;
      video.currentTime = desired;
    };

    const handleLoadedMetadata = () => {
      targetTimeRef.current = video.currentTime;
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!video.duration || Number.isNaN(video.duration)) return;

      if (prevXRef.current === null) {
        prevXRef.current = event.clientX;
        return;
      }

      const delta = event.clientX - prevXRef.current;
      prevXRef.current = event.clientX;
      const offset = (delta / window.innerWidth) * SENSITIVITY * video.duration;
      targetTimeRef.current = Math.max(0, Math.min(targetTimeRef.current + offset, video.duration));
      seekTowardTarget();
    };

    const handleSeeked = () => {
      seekingRef.current = false;
      if (Math.abs(video.currentTime - targetTimeRef.current) > 0.01) {
        seekTowardTarget();
      }
    };

    const handleMouseLeave = () => {
      prevXRef.current = null;
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('seeked', handleSeeked);
    window.addEventListener('mousemove', handleMouseMove);
    document.documentElement.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('seeked', handleSeeked);
      window.removeEventListener('mousemove', handleMouseMove);
      document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const copyJourney = async () => {
    try {
      await navigator.clipboard.writeText('발견 → 마음 → 연결 → 다시 걷기');
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="relative h-screen w-full overflow-hidden bg-[#f7f0e8] text-black">
      <video
        ref={videoRef}
        className="fixed inset-0 z-0 h-full w-full object-cover object-[70%_center]"
        src={VIDEO_URL}
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
      />

      <div className="pointer-events-none fixed inset-0 z-[1] bg-white/[0.03]" />

      <header className="fixed inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-4 sm:px-8 sm:py-5">
        <a href="#top" className="flex items-center gap-3" aria-label="LoveTree 홈">
          <span
            className="text-[21px] tracking-tight text-black sm:text-[26px]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            LoveTree®
          </span>
          <span className="select-none text-[25px] tracking-[-0.02em] text-black sm:text-[30px]">✳︎</span>
        </a>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center text-[23px] text-black md:flex" aria-label="주요 메뉴">
          {navItems.map((item, index) => (
            <span key={item} className="whitespace-nowrap">
              <a href={`#${index + 1}`} className="transition-opacity hover:opacity-60">
                {item}
              </a>
              {index < navItems.length - 1 ? ', ' : ''}
            </span>
          ))}
        </nav>

        <a
          href="#start"
          className="hidden text-[23px] text-black underline underline-offset-2 transition-opacity hover:opacity-60 md:block"
        >
          첫 순간 심기
        </a>

        <button
          type="button"
          className="relative z-[11] flex flex-col gap-[5px] md:hidden"
          aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span
            className={`h-[2px] w-6 bg-black transition-all duration-300 ${menuOpen ? 'translate-y-[7px] rotate-45' : ''}`}
          />
          <span
            className={`h-[2px] w-6 bg-black transition-opacity duration-300 ${menuOpen ? 'opacity-0' : 'opacity-100'}`}
          />
          <span
            className={`h-[2px] w-6 bg-black transition-all duration-300 ${menuOpen ? '-translate-y-[7px] -rotate-45' : ''}`}
          />
        </button>
      </header>

      <div
        className={`fixed inset-0 z-[9] flex flex-col justify-center gap-8 bg-white/95 px-8 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          menuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden={!menuOpen}
      >
        {navItems.map((item, index) => (
          <a
            key={item}
            href={`#${index + 1}`}
            className="text-[32px] font-medium"
            onClick={() => setMenuOpen(false)}
          >
            {item}
          </a>
        ))}
        <a href="#start" className="text-[32px] font-medium underline underline-offset-4" onClick={() => setMenuOpen(false)}>
          첫 순간 심기
        </a>
      </div>

      <section
        id="top"
        className="relative z-[1] flex h-screen flex-col justify-end overflow-hidden px-5 pb-12 sm:px-8 md:justify-center md:px-10 md:pb-0"
      >
        <div className="relative z-10 max-w-xl">
          <div
            className="pointer-events-none mb-5 select-none whitespace-pre-line font-normal text-black sm:mb-6"
            style={{
              fontSize: 'clamp(18px, 4vw, 26px)',
              lineHeight: 1.3,
              filter: 'blur(4px)',
            }}
          >
            {'여기, 마음이 움직인 순간을 심어요.\nLoveTree는 그 다음 마음까지 이어지는 감정의 경로입니다.'}
          </div>

          <p
            className="mb-5 min-h-[54px] font-normal text-black sm:mb-6"
            style={{ fontSize: 'clamp(18px, 4vw, 26px)', lineHeight: 1.35 }}
          >
            {displayed}
            {!done && <span className="ml-[2px] inline-block h-[1.1em] w-[2px] animate-blink align-middle bg-black" />}
          </p>

          <div
            id="start"
            className={`flex flex-wrap gap-y-1 transition-[opacity,transform] duration-[400ms] ease-out ${
              actionsVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
            }`}
          >
            {['첫 순간 심기', '러브트리 둘러보기', '내 러브트리 보기', '처음부터 다시 걷기'].map((label) => (
              <button
                key={label}
                type="button"
                className="mx-[0.2em] mb-[0.4em] inline-flex whitespace-nowrap items-center justify-center rounded-full border border-black/10 bg-white px-4 py-[0.3em] text-[13px] text-black transition-colors duration-200 hover:bg-black hover:text-white sm:px-5 sm:text-[15px]"
              >
                {label}
              </button>
            ))}

            <button
              type="button"
              onClick={copyJourney}
              className="mx-[0.2em] mb-[0.4em] inline-flex whitespace-nowrap items-center justify-center gap-2 rounded-full border border-white bg-transparent px-4 py-[0.3em] text-[13px] text-white transition-colors duration-200 hover:bg-white hover:text-black sm:gap-3 sm:px-5 sm:text-[15px]"
              aria-label="LoveTree 핵심 여정 문구 복사"
            >
              <span>
                {copied ? '복사했어요' : '발견 → 마음 → 연결 → 다시 걷기'}
              </span>
              <CopyIcon />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;

"use client";

import { CSSProperties, FormEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";

type Card = {
  position: { id: string; name_zh: string };
  card: { id: string; name_zh: string; name_en: string; image: string };
  orientation: "upright" | "reversed";
};

type Reading = {
  question: string;
  spread: { name_zh: string };
  cards: Card[];
  reading: {
    direct_answer: string;
    card_readings: Array<{ card_id: string; interpretation: string }>;
    combined_story: string;
    actionable_advice: string;
    deeper_question: string;
    closing: string;
  };
};

type Phase = "question" | "choosing" | "reading" | "revealed";

const promptExamples = [
  "如果现状不变，这段关系接下来会怎样？",
  "关于现在的工作选择，我最需要看清什么？",
  "此刻的我，正在忽略什么内在需要？",
];

const deck = Array.from({ length: 78 }, (_, index) => index);

export default function Home() {
  const [question, setQuestion] = useState("");
  const [phase, setPhase] = useState<Phase>("question");
  const [choices, setChoices] = useState<number[]>([]);
  const [result, setResult] = useState<Reading | null>(null);
  const [error, setError] = useState("");
  const [drawToken, setDrawToken] = useState("");
  const wheelRef = useRef<HTMLDivElement>(null);
  const wheelRotation = useRef(0);
  const wheelVelocity = useRef(0);
  const targetVelocity = useRef(0);
  const animationFrame = useRef(0);
  const touchDragging = useRef(false);
  const touchMoved = useRef(false);
  const lastTouchX = useRef(0);
  const cardReadingById = useMemo(
    () => new Map(result?.reading.card_readings.map((item) => [item.card_id, item.interpretation]) ?? []),
    [result],
  );

  useEffect(() => {
    if (phase !== "choosing") {
      targetVelocity.current = 0;
      return;
    }
    const animate = () => {
      wheelVelocity.current += (targetVelocity.current - wheelVelocity.current) * 0.055;
      wheelRotation.current += wheelVelocity.current;
      wheelRef.current?.style.setProperty("--wheel-rotation", `${wheelRotation.current}deg`);
      animationFrame.current = requestAnimationFrame(animate);
    };
    animationFrame.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame.current);
  }, [phase]);

  function begin(event: FormEvent) {
    event.preventDefault();
    if (question.trim().length < 2) return;
    setError("");
    setChoices([]);
    setResult(null);
    setDrawToken(crypto.randomUUID());
    wheelRotation.current = Math.random() * 360;
    wheelVelocity.current = 0;
    targetVelocity.current = 0;
    setPhase("choosing");
  }

  async function requestReading(selected: number[]) {
    setPhase("reading");
    try {
      const response = await fetch("/api/readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim(), choices: selected, draw_token: drawToken }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "这次连接没有成功，请稍后再试。");
      setResult(payload);
      setPhase("revealed");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "这次连接没有成功，请稍后再试。");
      setPhase("choosing");
    }
  }

  function chooseCard(index: number) {
    if (phase !== "choosing" || choices.includes(index) || choices.length >= 3) return;
    const selected = [...choices, index];
    setChoices(selected);
    if (selected.length === 3) setTimeout(() => requestReading(selected), 850);
  }

  function moveWheel(event: PointerEvent<HTMLElement>) {
    if (!wheelRef.current || phase !== "choosing") return;
    if (event.pointerType === "touch" && touchDragging.current) {
      const delta = event.clientX - lastTouchX.current;
      if (Math.abs(delta) > 2) touchMoved.current = true;
      wheelRotation.current += delta * 0.2;
      wheelVelocity.current = delta * 0.025;
      lastTouchX.current = event.clientX;
      wheelRef.current.style.setProperty("--wheel-rotation", `${wheelRotation.current}deg`);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const normalized = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1));
    targetVelocity.current = normalized * 0.24;
    wheelRef.current.style.setProperty("--glow-shift", `${normalized * 410}px`);
  }

  function slowWheel() {
    targetVelocity.current = 0;
    wheelRef.current?.style.setProperty("--glow-shift", "0px");
  }

  function startTouch(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== "touch") return;
    touchDragging.current = true;
    touchMoved.current = false;
    lastTouchX.current = event.clientX;
  }

  function endTouch() {
    touchDragging.current = false;
    targetVelocity.current = 0;
  }

  function reset() {
    setQuestion("");
    setChoices([]);
    setResult(null);
    setError("");
    setPhase("question");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className={`experience phase-${phase}`}>
      <div className="grain" />
      <header className="nav">
        <button className="brand" type="button" onClick={reset}><b>☾</b><span>DREAMCORE TAROT</span></button>
        <span className="nav-note">趋势不是命运</span>
      </header>

      {phase === "question" && (
        <section className="question-stage">
          <div className="moon-orbit"><span>✦</span></div>
          <p className="eyebrow">A QUIET SPACE FOR WHAT MATTERS</p>
          <h1>把那个反复出现的<br />问题，留在这里。</h1>
          <p className="intro">不需要问得完美。只要问你此刻真正想知道的。</p>
          <form className="question-box" onSubmit={begin}>
            <textarea
              aria-label="你的问题"
              value={question}
              onChange={(event) => setQuestion(event.target.value.slice(0, 500))}
              placeholder="如果现状不变，这段关系接下来会怎样？"
              rows={3}
              autoFocus
            />
            <div>
              <span>{question.length}/500</span>
              <button disabled={question.trim().length < 2}>进入牌阵 <i>→</i></button>
            </div>
          </form>
          <div className="examples">
            {promptExamples.map((prompt) => <button key={prompt} type="button" onClick={() => setQuestion(prompt)}>{prompt}</button>)}
          </div>
        </section>
      )}

      {(phase === "choosing" || phase === "reading") && (
        <section
          className="draw-stage"
          onPointerMove={moveWheel}
          onPointerLeave={slowWheel}
          onPointerDown={startTouch}
          onPointerUp={endTouch}
          onPointerCancel={endTouch}
        >
          <div className="question-echo">“{question}”</div>
          <div className="draw-copy">
            <span>◇</span>
            <h2>{phase === "reading" ? "牌正在回应你" : "凭直觉，选出三张牌"}</h2>
            <p>{phase === "reading" ? "先不要急着寻找答案" : `已经选择 ${choices.length} / 3`}</p>
          </div>

          <div className="chosen-row" aria-label="已选择的牌">
            {[0, 1, 2].map((slot) => (
              <div className={`chosen-slot ${choices[slot] !== undefined ? "filled" : ""}`} key={slot}>
                {choices[slot] !== undefined && <img src="/cards_corrected/back/card_back.jpg" alt={`已选择的第 ${slot + 1} 张牌`} />}
              </div>
            ))}
          </div>

          <p className="wheel-hint">移动鼠标转动牌环 · 点击直觉停留的牌</p>
          <div className="wheel-viewport">
            <div ref={wheelRef} className={`card-wheel ${phase === "reading" ? "is-sinking" : ""}`}>
              {deck.map((index) => (
                <button
                  type="button"
                  className={`ring-card ${choices.includes(index) ? "is-chosen" : ""}`}
                  style={{
                    "--angle": `${index * (360 / deck.length)}deg`,
                    "--deal-delay": `${index * 5}ms`,
                  } as CSSProperties}
                  key={index}
                  onClick={() => {
                    if (touchMoved.current) {
                      touchMoved.current = false;
                      return;
                    }
                    chooseCard(index);
                  }}
                  aria-label={`选择牌环中的第 ${index + 1} 张牌`}
                >
                  <span className="ring-card-inner"><img src="/cards_corrected/back/card_back.jpg" alt="" /></span>
                </button>
              ))}
            </div>
          </div>
          {error && <p className="error" role="alert">{error}</p>}
        </section>
      )}

      {phase === "revealed" && result && (
        <section className="result-stage" id="reading">
          <div className="result-heading">
            <p>{result.spread.name_zh}</p>
            <h2>这是此刻来到你面前的牌</h2>
          </div>

          <div className="revealed-grid">
            {result.cards.map((draw, index) => (
              <article className="revealed-card" key={draw.card.id} style={{ "--reveal-delay": `${index * 320}ms` } as CSSProperties}>
                <div className="flip-scene">
                  <div className="flip-card">
                    <div className="flip-face flip-back"><img src="/cards_corrected/back/card_back.jpg" alt="塔罗牌背" /></div>
                    <div className={`flip-face flip-front ${draw.orientation === "reversed" ? "is-reversed" : ""}`}><img src={draw.card.image} alt={draw.card.name_zh} /></div>
                  </div>
                </div>
                <span>0{index + 1} · {draw.position.name_zh}</span>
                <h3>{draw.card.name_zh}</h3>
                <small>{draw.card.name_en} · {draw.orientation === "upright" ? "正位" : "逆位"}</small>
                <p>{cardReadingById.get(draw.card.id)}</p>
              </article>
            ))}
          </div>

          <div className="reading-core">
            <section className="direct-answer"><span>先说结论</span><p>{result.reading.direct_answer}</p></section>
            <div className="reading-pair">
              <section><span>三张牌在说什么</span><p>{result.reading.combined_story}</p></section>
              <section className="action"><span>现在可以做什么</span><p>{result.reading.actionable_advice}</p></section>
            </div>
            <section className="one-question"><span>留给你的一个问题</span><blockquote>{result.reading.deeper_question}</blockquote></section>
            <p className="closing">{result.reading.closing}</p>
            <button className="end-reading" type="button" onClick={reset}>结束这次阅读</button>
          </div>
        </section>
      )}

      <footer><span>☾</span><p>塔罗提供视角，不替代现实判断与专业建议。</p></footer>
    </main>
  );
}

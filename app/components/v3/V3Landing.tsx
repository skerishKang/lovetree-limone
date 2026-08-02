import Link from "next/link";

const STORY = [
  { step: "01", title: "첫 순간", body: "마음이 멈춘 정확한 장면을 한 순간으로 기록해요." },
  { step: "02", title: "마음 남기기", body: "그때의 감정과 이유를 감정 태그로 남겨요." },
  { step: "03", title: "이어지는 이유", body: "왜 다음 순간으로 이어졌는지 연결을 남겨요." },
];

export default function V3Landing() {
  return (
    <div className="v3-page">
      <section className="v3-landing" aria-labelledby="v3-landing-title">
        <div className="v3-landing-copy">
          <p className="v3-eyebrow">a chronicle of every feeling</p>
          <h1 id="v3-landing-title">
            마음이 움직인
            <em>그 순간을</em>
            <strong>이유와 함께 기억해요</strong>
          </h1>
          <p className="v3-landing-description">
            한 순간을 발견하고, 그때의 마음을 남기고, 왜 다음 순간으로 이어졌는지를
            연결해 시간이 쌓인 나만의 사랑 연혁을 만드는 서비스예요.
          </p>
          <div className="v3-landing-actions">
            <Link className="v3-btn v3-btn-primary" href="/v3/trees/new">
              <span aria-hidden="true">+</span>
              첫 순간 심기
            </Link>
            <Link className="v3-btn v3-btn-quiet" href="/v3/community">
              공개 트리 둘러보기
              <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="v3-growth-proof">
            <div className="v3-growth-label">러브트리는 이렇게 자라요</div>
            <div className="v3-growth-line" aria-label="발견, 마음, 연결, 성장">
              <span className="v3-growth-item v3-growth-active">
                <b>01</b> 발견
              </span>
              <i aria-hidden="true" />
              <span className="v3-growth-item">
                <b>02</b> 마음
              </span>
              <i aria-hidden="true" />
              <span className="v3-growth-item">
                <b>03</b> 연결
              </span>
              <i aria-hidden="true" />
              <span className="v3-growth-item">
                <b>04</b> 성장
              </span>
            </div>
          </div>
        </div>
        <div className="v3-tree-stage" aria-label="한 순간에서 사랑 연혁이 자라는 예시">
          <div className="v3-stage-topline">
            <span>
              <span className="v3-preview-badge">V3 예시 데이터</span>
            </span>
            <span className="v3-stage-season">chronicle 01</span>
          </div>
          <div className="v3-tree-canvas">
            <div className="v3-orbit v3-orbit-one" />
            <div className="v3-orbit v3-orbit-two" />
            <div className="v3-trunk" />
            <div className="v3-branch v3-branch-left" />
            <div className="v3-branch v3-branch-right" />
            <article className="v3-moment-preview v3-preview-root">
              <div className="v3-preview-media v3-media-root">
                <span aria-hidden="true">▶</span>
                <small>01:30</small>
              </div>
              <div className="v3-preview-body">
                <span className="v3-preview-tag">처음 발견한 순간</span>
                <strong>마음이 멈춘 장면</strong>
                <p>짧은 영상 하나가 이상하게 오래 마음에 남았어요.</p>
              </div>
            </article>
            <article className="v3-moment-preview v3-preview-a">
              <div className="v3-preview-media v3-media-a">
                <span aria-hidden="true">▶</span>
                <small>03:12</small>
              </div>
              <div className="v3-preview-body">
                <span className="v3-preview-tag">팬의 추천</span>
                <strong>다시 찾은 노래</strong>
                <p>이 장면을 보면 계속 생각나는 곡이에요.</p>
              </div>
            </article>
            <article className="v3-moment-preview v3-preview-b">
              <div className="v3-preview-media v3-media-b">
                <span aria-hidden="true">↗</span>
                <small>07:48</small>
              </div>
              <div className="v3-preview-body">
                <span className="v3-preview-tag">이어진 이유</span>
                <strong>오래 간직할 문장</strong>
                <p>오늘의 마음을 잊지 않게 적어 두었어요.</p>
              </div>
            </article>
            <div className="v3-seed-mark" aria-hidden="true">
              ✦
            </div>
          </div>
          <div className="v3-stage-caption">
            <span className="v3-caption-rule" />
            <p>
              한 장면에서 시작한 마음이
              <b> 이유와 함께 이어져 자라나요.</b>
            </p>
          </div>
        </div>
      </section>
      <section className="v3-landing-strip" aria-label="사랑 연혁 특징">
        {STORY.map((item) => (
          <div className="v3-strip-card" key={item.step}>
            <span>{item.step}</span>
            <strong>{item.title}</strong>
            <p>{item.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

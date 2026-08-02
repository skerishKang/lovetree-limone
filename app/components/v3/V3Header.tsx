import Link from "next/link";

const NAV_LINKS = [
  { href: "/v3", label: "시작하기" },
  { href: "/v3/my-trees", label: "내 정원" },
  { href: "/v3/community", label: "공개 정원" },
];

export default function V3Header() {
  return (
    <header className="v3-topbar">
      <Link className="v3-brand" href="/v3">
        <span className="v3-brand-mark" aria-hidden="true">
          <i />
          <b />
        </span>
        <span>LoveTree V3</span>
      </Link>
      <nav className="v3-nav" aria-label="V3 주요 메뉴">
        {NAV_LINKS.map((link) => (
          <Link href={link.href} key={link.href}>
            {link.label}
          </Link>
        ))}
        <span className="v3-preview-badge">V3 예시 데이터</span>
      </nav>
    </header>
  );
}

"use client";

import { useEffect } from "react";

function youtubeId(value: string): string | null {
  const match = String(value || "").match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/))([\w-]{6,})/,
  );
  return match?.[1] || null;
}

function timeToSeconds(value: string): number | null {
  const parts = String(value || "")
    .trim()
    .split(":")
    .map((part) => Number(part));
  if (!parts.length || parts.some((part) => !Number.isFinite(part) || part < 0)) return null;
  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    if (seconds >= 60) return null;
    return minutes * 60 + seconds;
  }
  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    if (minutes >= 60 || seconds >= 60) return null;
    return hours * 3600 + minutes * 60 + seconds;
  }
  return null;
}

function rangeFromModal(modal: HTMLElement): { start: number; end: number | null } {
  const rows = Array.from(modal.querySelectorAll<HTMLElement>(".v4-moments-detail-row"));
  const row = rows.find((item) => item.querySelector("span")?.textContent?.trim() === "기억할 구간");
  const raw = row?.querySelector("strong")?.textContent?.trim() || "";
  if (!raw || raw === "전체" || raw === "해당 없음") return { start: 0, end: null };
  const [startRaw, endRaw] = raw.split(/[–-]/).map((part) => part.trim());
  const start = timeToSeconds(startRaw) ?? 0;
  const parsedEnd = endRaw ? timeToSeconds(endRaw) : null;
  return { start, end: parsedEnd !== null && parsedEnd > start ? parsedEnd : null };
}

function embedUrl(id: string, start: number, end: number | null): string {
  const params = new URLSearchParams({ autoplay: "1", start: String(Math.max(0, start)), rel: "0" });
  if (end !== null && end > start) params.set("end", String(end));
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}

export default function V4Moments100ExactRangePlayback() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".v4-moments-page");
    if (!root) return;
    root.dataset.exactRangePlayback = "enabled";

    const sync = () => {
      const modal = root.querySelector<HTMLElement>("#videoModal");
      if (!modal) return;
      const open = modal.getAttribute("data-hidden") !== "true";
      const player = modal.querySelector<HTMLElement>(".v4-moments-video-player");
      const poster = modal.querySelector<HTMLElement>(".v4-moments-video-poster");
      const external = modal.querySelector<HTMLAnchorElement>(".v4-moments-video-open");
      if (!player || !poster) return;

      const current = player.querySelector<HTMLIFrameElement>("iframe[data-exact-range-player='true']");
      if (!open) {
        current?.remove();
        poster.hidden = false;
        delete player.dataset.playerState;
        return;
      }

      const id = youtubeId(external?.href || "");
      if (!id) {
        current?.remove();
        poster.hidden = false;
        player.dataset.playerState = "invalid-video-url";
        return;
      }

      const { start, end } = rangeFromModal(modal);
      const src = embedUrl(id, start, end);
      if (current?.getAttribute("src") === src) {
        poster.hidden = true;
        return;
      }
      current?.remove();
      const iframe = document.createElement("iframe");
      iframe.dataset.exactRangePlayer = "true";
      iframe.src = src;
      iframe.title =
        modal.querySelector(".v4-moments-video-detail h3")?.textContent?.trim() ||
        "LoveTree video Moment";
      iframe.allow = "autoplay; encrypted-media; picture-in-picture";
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      player.prepend(iframe);
      poster.hidden = true;
      player.dataset.playerState = "exact-range";
      player.dataset.videoId = id;
      player.dataset.startSeconds = String(start);
      if (end !== null) player.dataset.endSeconds = String(end);
      else delete player.dataset.endSeconds;
    };

    const observer = new MutationObserver(sync);
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-hidden", "href"],
    });
    sync();

    return () => {
      observer.disconnect();
      root.querySelectorAll("iframe[data-exact-range-player='true']").forEach((frame) => frame.remove());
      delete root.dataset.exactRangePlayback;
    };
  }, []);

  return null;
}

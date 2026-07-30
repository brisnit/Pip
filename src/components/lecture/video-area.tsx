import { Notice } from "@/components/ui/primitives";

/**
 * Content-provider abstraction for lecture video.
 *
 * The prototype hosts nothing. It recognises YouTube and Vimeo well enough to
 * build an embed URL, links out for anything else, and — critically — says so
 * plainly when a URL is a placeholder rather than rendering a dead player.
 *
 * Adding a provider means adding one branch to `resolveEmbed`.
 */
type Embed =
  | { kind: "iframe"; src: string; title: string; provider: string }
  | { kind: "link"; href: string; provider: string }
  | { kind: "placeholder"; reason: string }
  | { kind: "none" };

const PLACEHOLDER_PATTERN = /DEMO_PLACEHOLDER|example\.(com|org|edu)/i;

export function resolveEmbed(
  url: string | null,
  title: string,
): Embed {
  if (!url) return { kind: "none" };

  if (PLACEHOLDER_PATTERN.test(url)) {
    return {
      kind: "placeholder",
      reason:
        "No recording is attached to this lecture yet. The outline, notes, transcript and comprehension checks below are all live.",
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { kind: "placeholder", reason: "The recording link is not a valid URL." };
  }

  const host = parsed.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = parsed.pathname.slice(1);
    return id
      ? {
          kind: "iframe",
          src: `https://www.youtube-nocookie.com/embed/${id}`,
          title,
          provider: "YouTube",
        }
      : { kind: "link", href: url, provider: "YouTube" };
  }

  if (host.endsWith("youtube.com")) {
    const id = parsed.searchParams.get("v");
    return id
      ? {
          kind: "iframe",
          src: `https://www.youtube-nocookie.com/embed/${id}`,
          title,
          provider: "YouTube",
        }
      : { kind: "link", href: url, provider: "YouTube" };
  }

  if (host.endsWith("vimeo.com")) {
    const id = parsed.pathname.split("/").filter(Boolean).pop();
    return id && /^\d+$/.test(id)
      ? {
          kind: "iframe",
          src: `https://player.vimeo.com/video/${id}`,
          title,
          provider: "Vimeo",
        }
      : { kind: "link", href: url, provider: "Vimeo" };
  }

  return { kind: "link", href: url, provider: host };
}

export function VideoArea({
  videoUrl,
  liveUrl,
  isLive,
  title,
  hasTranscript,
}: {
  videoUrl: string | null;
  liveUrl: string | null;
  isLive: boolean;
  title: string;
  hasTranscript: boolean;
}) {
  const live = resolveEmbed(liveUrl, `${title} — live`);
  const recorded = resolveEmbed(videoUrl, title);
  const primary = isLive && live.kind !== "none" ? live : recorded;

  return (
    <div className="space-y-3">
      {primary.kind === "iframe" ? (
        <div className="overflow-hidden rounded-lg border border-tan-200 bg-ink-900">
          <div className="relative aspect-video">
            <iframe
              src={primary.src}
              title={primary.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
            />
          </div>
        </div>
      ) : primary.kind === "link" ? (
        <div className="rounded-lg border border-tan-200 bg-paper-200 p-6 text-center">
          <p className="text-sm text-ink-600">
            This lecture is hosted on {primary.provider}.
          </p>
          <p className="mt-3">
            <a
              href={primary.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium"
            >
              Open the {isLive ? "live session" : "recording"} on{" "}
              {primary.provider}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </p>
          <p className="mt-2 text-[0.82rem] text-ink-500">
            Keep this page open alongside it — your notes, markers and questions
            all live here.
          </p>
        </div>
      ) : primary.kind === "placeholder" ? (
        <Notice tone="info" title="No recording is available for this lecture">
          {primary.reason}
        </Notice>
      ) : (
        <Notice tone="info" title="No recording or live link yet">
          Your professor has not attached a video for this lecture. Everything else
          on this page works without it.
        </Notice>
      )}

      {isLive && recorded.kind !== "none" && primary !== recorded ? (
        <p className="text-[0.82rem] text-ink-500">
          A recording is also attached and will be available after the session.
        </p>
      ) : null}

      <p className="text-[0.82rem] text-ink-500">
        {hasTranscript
          ? "A full transcript is below. Captions come from the video provider."
          : "No transcript has been added for this lecture. Captions come from the video provider."}
      </p>
    </div>
  );
}

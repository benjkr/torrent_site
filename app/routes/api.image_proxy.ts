import type { Route } from "./+types/api.image_proxy";

const ALLOWED_HOST_RE =
  /^(?:[\w-]+\.)*(?:media-amazon\.com|ssl-images-amazon\.com|amazon\.com|imdb\.com)$/i;

export async function loader({ request }: Route.LoaderArgs) {
  const raw = new URL(request.url).searchParams.get("url");
  if (!raw) {
    return new Response("missing url", { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new Response("invalid url", { status: 400 });
  }

  if (target.protocol !== "https:" || !ALLOWED_HOST_RE.test(target.hostname)) {
    return new Response("host not allowed", { status: 403 });
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: {
        Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
        "User-Agent": "torrent-site/1.0",
      },
    });
    if (!upstream.ok) {
      return new Response("upstream error", { status: upstream.status });
    }

    const contentType = upstream.headers.get("Content-Type") || "image/jpeg";
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new Response("fetch failed", { status: 502 });
  }
}

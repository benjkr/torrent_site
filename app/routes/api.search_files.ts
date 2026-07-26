import type { LoaderFunctionArgs } from "react-router";

const APYBAY_BASE = "https://apibay.org";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return new Response(JSON.stringify({ error: "missing id" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const files = await fetch(`${APYBAY_BASE}/f.php?id=${encodeURIComponent(id)}`).then((r) =>
      r.json(),
    );
    return { files: Array.isArray(files) ? files : [] };
  } catch {
    return { files: [] };
  }
}

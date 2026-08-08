import type { ComponentType } from "react";
import { useParams, type LoaderFunctionArgs } from "react-router";

const pageModules = import.meta.env.DEV
  ? import.meta.glob<{ default: ComponentType }>("../dev-pages/*.tsx", {
      eager: true,
    })
  : {};

function moduleForSlug(slug: string | undefined) {
  if (!slug || slug.startsWith("_")) return undefined;
  return pageModules[`../dev-pages/${slug}.tsx`];
}

export async function loader({ params }: LoaderFunctionArgs) {
  if (!import.meta.env.DEV) {
    throw new Response(null, { status: 404, statusText: "Not Found" });
  }
  if (!moduleForSlug(params.slug)) {
    throw new Response(null, { status: 404, statusText: "Not Found" });
  }
  return null;
}

export default function DevPageHost() {
  const { slug } = useParams();
  const Page = moduleForSlug(slug)?.default;
  if (!Page) return null;
  return <Page />;
}

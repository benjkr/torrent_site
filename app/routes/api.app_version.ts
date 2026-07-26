import { getAppVersion } from "@/lib/app-version";
import { readAppVersionFromGit } from "@/lib/git-app-version.server";

/** Live git info in DEV; baked build values in production. */
export async function loader(): Promise<Response> {
  const version = import.meta.env.DEV
    ? readAppVersionFromGit()
    : getAppVersion();
  return Response.json(version);
}

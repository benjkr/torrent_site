import { redirect } from "react-router";

/** Legacy path — Library lives at /library */
export function loader() {
  return redirect("/library");
}

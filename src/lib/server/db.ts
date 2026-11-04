import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "./env";
import { AppError } from "../errors";
export async function userDb() {
  const e = env();
  if (
    e.SPECTRA_MODE !== "live" ||
    !e.SUPABASE_URL ||
    !e.SUPABASE_PUBLISHABLE_KEY
  )
    throw new AppError(
      "SETUP",
      503,
      "Spectra is not connected yet. Configure Supabase and the server environment.",
    );
  const jar = await cookies();
  return createServerClient(e.SUPABASE_URL, e.SUPABASE_PUBLISHABLE_KEY, {
    cookieOptions: {
      httpOnly: true,
      secure: new URL(e.APP_URL).protocol === "https:",
      sameSite: "lax",
      path: "/",
    },
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (values) => {
        for (const { name, value, options } of values)
          jar.set(name, value, options);
      },
    },
  });
}

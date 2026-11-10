import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { env } from "./env";
import { AppError } from "../errors";
import { localSessionAllowed } from "../security/local-session";
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
  const db = createServerClient(e.SUPABASE_URL, e.SUPABASE_PUBLISHABLE_KEY, {
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
  if (e.LOCAL_AUTO_SIGN_IN === "true") {
    if (
      !localSessionAllowed(
        e.APP_URL,
        await headers(),
        Boolean(process.env.VERCEL),
      )
    )
      throw new AppError(
        "LOCAL_ONLY",
        403,
        "Automatic test sign-in is available only on this computer.",
      );
    const { data } = await db.auth.getUser();
    if (!data.user) {
      const { error } = await db.auth.signInWithPassword({
        email: e.LOCAL_TEST_EMAIL!,
        password: e.LOCAL_TEST_PASSWORD!,
      });
      if (error)
        throw new AppError(
          "LOCAL_AUTH",
          503,
          "Local test sign-in failed. Check the test account configuration.",
        );
    }
  }
  return db;
}

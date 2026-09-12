import { useEffect, useState } from "react";
import { refreshAccessToken } from "../services/api";

// On first load there's no access token in memory (it never survives a
// reload by design). We attempt one silent refresh using the HttpOnly
// cookie; if it succeeds the user stays logged in, otherwise they see the
// login page. This runs once at the root of the app.
export function useAuthBootstrap() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    refreshAccessToken().finally(() => setReady(true));
  }, []);

  return ready;
}

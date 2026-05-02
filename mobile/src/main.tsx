import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router } from "./router";
import "./styles/global.css";
import { useAuthStore } from "./auth/store";
import { subscribeToPush } from "./push/subscribe";
import { wsClient } from "./api/ws";
import { wsHandlers } from "./api/wsHandlers";

// Register service worker (vite-plugin-pwa handles this via registerType: autoUpdate)
// but we also need to subscribe to push after auth
if ("serviceWorker" in navigator) {
  // The PWA plugin injects the SW registration; we hook in after it's ready
  navigator.serviceWorker.ready.then(() => {
    const { token } = useAuthStore.getState();
    if (token) {
      void subscribeToPush(token).then((status) => {
        if (status === "unsupported" || status === "denied") {
          // Banner is shown via React tree — store is read by Settings page
          console.info("[push] Push notifications not available:", status);
        }
      });
      wsClient.connect(token);
    }
  });
}

// Listen for auth changes and reconnect WS / subscribe push
useAuthStore.subscribe((state, prev) => {
  if (state.token && state.token !== prev.token) {
    wsClient.connect(state.token);
    void subscribeToPush(state.token);
  }
  if (!state.token && prev.token) {
    wsClient.disconnect();
  }
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10_000,
    },
  },
});

// Wire WS frames to in-app toast handlers (registered by Layout)
wsClient.subscribe((frame) => {
  wsHandlers.forEach((h) => h(frame));
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
);

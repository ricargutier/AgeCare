import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router } from "./router";
import { wsClient } from "./api/ws";
import { useAuthStore } from "./auth/store";
import "./styles/global.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function WsConnector() {
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (token) {
      wsClient.connect();
    } else {
      wsClient.disconnect();
    }
    return () => {
      // do not disconnect on unmount in dev strict-mode double-effect
    };
  }, [token]);

  return null;
}

const root = document.getElementById("root");
if (!root) throw new Error("No #root element found");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <WsConnector />
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
);

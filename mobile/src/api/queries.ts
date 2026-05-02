import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import { useAuthStore } from "../auth/store";

function useToken(): string {
  const token = useAuthStore((s) => s.token);
  if (!token) throw new Error("Not authenticated");
  return token;
}

export function useElders() {
  const token = useToken();
  return useQuery({
    queryKey: ["elders"],
    queryFn: () => api.getElders(token),
  });
}

export function useElder(id: string) {
  const token = useToken();
  return useQuery({
    queryKey: ["elder", id],
    queryFn: () => api.getElder(id, token),
    enabled: !!id,
  });
}

export function useVitals(
  elderId: string,
  params: { from: string; to: string; metric?: string }
) {
  const token = useToken();
  return useQuery({
    queryKey: ["vitals", elderId, params],
    queryFn: () => api.getVitals(elderId, params, token),
    enabled: !!elderId,
    refetchInterval: 30_000,
  });
}

export function useAlerts(
  elderId: string,
  params: { status?: string; since?: string } = {}
) {
  const token = useToken();
  return useQuery({
    queryKey: ["alerts", elderId, params],
    queryFn: () => api.getAlerts(elderId, params, token),
    enabled: !!elderId,
    refetchInterval: 15_000,
  });
}

export function useAcknowledgeAlert() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (alertId: string) => api.acknowledgeAlert(alertId, token),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["alerts"] });
    },
  });
}

export function useResolveAlert() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (alertId: string) => api.resolveAlert(alertId, token),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["alerts"] });
    },
  });
}

export function useMedications(elderId: string) {
  const token = useToken();
  return useQuery({
    queryKey: ["medications", elderId],
    queryFn: () => api.getMedications(elderId, token),
    enabled: !!elderId,
  });
}

export function useConfirmMedication() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => api.confirmMedication(eventId, token),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["medications"] });
    },
  });
}

export function useDevices(elderId: string) {
  const token = useToken();
  return useQuery({
    queryKey: ["devices", elderId],
    queryFn: () => api.getDevices(elderId, token),
    enabled: !!elderId,
    refetchInterval: 60_000,
  });
}

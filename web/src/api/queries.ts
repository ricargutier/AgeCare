import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { apiClient } from "./client";
import type {
  User,
  Elder,
  VitalsSample,
  Alert,
  AlertStatus,
  MedicationSchedule,
  Device,
  MedicationEvent,
  AuditLog,
  LoginRequest,
  LoginResponse,
} from "../../../shared/contracts/types";
import { useAuthStore } from "../auth/store";

// ─── Query keys ──────────────────────────────────────────────────────────────

export const queryKeys = {
  me: ["me"] as const,
  elders: ["elders"] as const,
  elder: (id: string) => ["elder", id] as const,
  elderVitals: (id: string, range: string) => ["elder-vitals", id, range] as const,
  elderAlerts: (id: string, status?: AlertStatus) =>
    status ? ["elder-alerts", id, status] : (["elder-alerts", id] as const),
  elderMedications: (id: string) => ["elder-medications", id] as const,
  elderDevices: (id: string) => ["elder-devices", id] as const,
  auditLog: ["audit-log"] as const,
};

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useMe(options?: Partial<UseQueryOptions<User>>) {
  return useQuery<User>({
    queryKey: queryKeys.me,
    queryFn: () => apiClient.get<User>("/auth/me"),
    ...options,
  });
}

export function useElders() {
  return useQuery<Elder[]>({
    queryKey: queryKeys.elders,
    queryFn: () => apiClient.get<Elder[]>("/elders"),
  });
}

export function useElder(id: string) {
  return useQuery<Elder>({
    queryKey: queryKeys.elder(id),
    queryFn: () => apiClient.get<Elder>(`/elders/${id}`),
    enabled: Boolean(id),
  });
}

export interface VitalsRange {
  from?: string;
  to?: string;
  metric?: string;
}

export function useElderVitals(id: string, range: string, params?: VitalsRange) {
  const qs = new URLSearchParams();
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  if (params?.metric) qs.set("metric", params.metric);
  const queryString = qs.toString();

  return useQuery<VitalsSample[]>({
    queryKey: queryKeys.elderVitals(id, range),
    queryFn: () =>
      apiClient.get<VitalsSample[]>(
        `/elders/${id}/vitals${queryString ? `?${queryString}` : ""}`
      ),
    enabled: Boolean(id),
    refetchInterval: 30_000,
  });
}

export function useElderAlerts(id: string, status?: AlertStatus) {
  return useQuery<Alert[]>({
    queryKey: queryKeys.elderAlerts(id, status),
    queryFn: () =>
      apiClient.get<Alert[]>(
        `/elders/${id}/alerts${status ? `?status=${status}` : ""}`
      ),
    enabled: Boolean(id),
    refetchInterval: 15_000,
  });
}

export function useElderMedications(id: string) {
  return useQuery<MedicationSchedule[]>({
    queryKey: queryKeys.elderMedications(id),
    queryFn: () => apiClient.get<MedicationSchedule[]>(`/elders/${id}/medications`),
    enabled: Boolean(id),
  });
}

export function useElderDevices(id: string) {
  return useQuery<Device[]>({
    queryKey: queryKeys.elderDevices(id),
    queryFn: () => apiClient.get<Device[]>(`/elders/${id}/devices`),
    enabled: Boolean(id),
    refetchInterval: 60_000,
  });
}

export function useAuditLog(since?: string) {
  return useQuery<AuditLog[]>({
    queryKey: [...queryKeys.auditLog, since],
    queryFn: () =>
      apiClient.get<AuditLog[]>(`/audit${since ? `?since=${since}` : ""}`),
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export function useAcknowledgeAlert() {
  const qc = useQueryClient();
  return useMutation<Alert, Error, string>({
    mutationFn: (alertId) =>
      apiClient.post<Alert>(`/alerts/${alertId}/acknowledge`),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: queryKeys.elderAlerts(updated.elderId) });
      qc.invalidateQueries({ queryKey: queryKeys.elder(updated.elderId) });
    },
  });
}

export function useResolveAlert() {
  const qc = useQueryClient();
  return useMutation<Alert, Error, string>({
    mutationFn: (alertId) =>
      apiClient.post<Alert>(`/alerts/${alertId}/resolve`),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: queryKeys.elderAlerts(updated.elderId) });
      qc.invalidateQueries({ queryKey: queryKeys.elder(updated.elderId) });
    },
  });
}

export function useConfirmMedication() {
  const qc = useQueryClient();
  return useMutation<
    MedicationEvent,
    Error,
    { eventId: string; elderId: string; takenAt?: string }
  >({
    mutationFn: ({ eventId, takenAt }) =>
      apiClient.post<MedicationEvent>(`/medications/events/${eventId}/confirm`, {
        takenAt,
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.elderMedications(vars.elderId) });
    },
  });
}

export function useLogin() {
  const login = useAuthStore((s) => s.login);
  return useMutation<LoginResponse, Error, LoginRequest>({
    mutationFn: (creds) => apiClient.post<LoginResponse>("/auth/login", creds),
    onSuccess: (data) => {
      login(data.token, data.user);
    },
  });
}

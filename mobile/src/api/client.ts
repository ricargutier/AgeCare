import type {
  LoginRequest,
  LoginResponse,
  User,
  Elder,
  Alert,
  VitalsSample,
  MedicationSchedule,
  MedicationEvent,
  Device,
  PushSubscribeRequest,
} from '../../../shared/contracts/types';

const BASE = "";

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(
      (body as { error?: { message?: string } }).error?.message ?? res.statusText
    );
  }
  return res.json() as Promise<T>;
}

export const api = {
  login: (data: LoginRequest) =>
    request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  me: (token: string) => request<User>("/auth/me", {}, token),

  getElders: (token: string) => request<Elder[]>("/elders", {}, token),

  getElder: (id: string, token: string) =>
    request<Elder>(`/elders/${id}`, {}, token),

  getVitals: (
    elderId: string,
    params: { from: string; to: string; metric?: string },
    token: string
  ) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return request<VitalsSample[]>(`/elders/${elderId}/vitals?${qs}`, {}, token);
  },

  getAlerts: (
    elderId: string,
    params: { status?: string; since?: string },
    token: string
  ) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined)
      ) as Record<string, string>
    ).toString();
    return request<Alert[]>(`/elders/${elderId}/alerts?${qs}`, {}, token);
  },

  acknowledgeAlert: (alertId: string, token: string) =>
    request<Alert>(`/alerts/${alertId}/acknowledge`, { method: "POST" }, token),

  resolveAlert: (alertId: string, token: string) =>
    request<Alert>(`/alerts/${alertId}/resolve`, { method: "POST" }, token),

  getMedications: (elderId: string, token: string) =>
    request<(MedicationSchedule & { events: MedicationEvent[] })[]>(
      `/elders/${elderId}/medications`,
      {},
      token
    ),

  confirmMedication: (eventId: string, token: string, takenAt?: string) =>
    request<MedicationEvent>(
      `/medications/events/${eventId}/confirm`,
      {
        method: "POST",
        body: JSON.stringify(takenAt ? { takenAt } : {}),
      },
      token
    ),

  getDevices: (elderId: string, token: string) =>
    request<Device[]>(`/elders/${elderId}/devices`, {}, token),

  subscribePush: (sub: PushSubscribeRequest, token: string) =>
    request<{ ok: boolean }>("/push/subscribe", {
      method: "POST",
      body: JSON.stringify(sub),
    }, token),

  getVapidPublicKey: (token: string) =>
    request<{ publicKey: string }>("/push/vapid-public-key", {}, token),
};

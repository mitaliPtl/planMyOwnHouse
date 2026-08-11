import type { ApiError, ApiSuccess } from "@/lib/api-response";

export async function postJson<T>(url: string, body: unknown): Promise<ApiSuccess<T> | ApiError> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return response.json();
}

export async function patchJson<T>(url: string, body: unknown): Promise<ApiSuccess<T> | ApiError> {
  const response = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return response.json();
}

export async function putJson<T>(url: string, body: unknown): Promise<ApiSuccess<T> | ApiError> {
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return response.json();
}

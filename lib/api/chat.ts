const API_BASE = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/v1`;

export interface Message {
  _id: string;
  user_id: string;
  sender: "user" | "admin";
  text: string;
  image_url?: string | null;
  order_id?: string | null;
  is_read: boolean;
  createdAt: string;
}

export async function getChatMessages(
  userId: string,
  params: { before?: string } = {},
  accessToken?: string,
): Promise<Message[]> {
  const qs = params.before ? `?before=${encodeURIComponent(params.before)}` : "";
  const res = await fetch(`${API_BASE}/chat/${userId}/messages${qs}`, {
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`getChatMessages: ${res.status}`);
  const json = await res.json();
  return Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
}

import { NextResponse } from "next/server";

interface Bucket {
  timestamps: number[];
}

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;
const MAX_BUCKETS = 1_000;

const buckets = new Map<string, Bucket>();

function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "local";
}

function pruneBuckets(now: number) {
  if (buckets.size <= MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.timestamps.length === 0 || now - bucket.timestamps[bucket.timestamps.length - 1] > WINDOW_MS) {
      buckets.delete(key);
    }
    if (buckets.size <= MAX_BUCKETS / 2) break;
  }
}

export function enforceRateLimit(
  request: Request,
  routeKey: string,
  maxRequests = MAX_REQUESTS,
  windowMs = WINDOW_MS
): NextResponse | null {
  const now = Date.now();
  pruneBuckets(now);

  const key = `${routeKey}:${getClientIp(request)}`;
  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((ts) => now - ts < windowMs);

  if (bucket.timestamps.length >= maxRequests) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    return NextResponse.json(
      {
        error: `リクエストが集中しています。${retryAfterSec}秒後に再試行してください。`,
        code: "RATE_LIMITED",
      },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSec) },
      }
    );
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return null;
}

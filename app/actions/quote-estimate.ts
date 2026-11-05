"use server";

import { headers } from "next/headers";
import { geocode, roadDistance } from "@/app/lib/kakao";
import { faresForDistance } from "@/app/lib/quote-fares";

export type RouteEstimate =
  | {
      ok: true;
      km: number;
      minutes: number;
      /** 화면 톤수별 예상 운임 (null = 별도 상담) */
      fares: Record<string, number | null>;
    }
  | { ok: false; message: string };

// 공개 페이지라 카카오 무료 사용량을 지키려고 같은 주소 조합은 재사용하고, 한 사람의 연속 요청을 제한합니다.
// (서버 인스턴스 메모리 기준이라 완벽하지는 않지만 반복 클릭·단순 남용은 막습니다.)
const CACHE_LIMIT = 500;
const cache = new Map<string, { km: number; minutes: number }>();
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 30;
const recentRequests = new Map<string, number[]>();

function tooManyRequests(ip: string) {
  const now = Date.now();
  const times = (recentRequests.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  times.push(now);
  recentRequests.set(ip, times);
  if (recentRequests.size > 5000) recentRequests.clear();
  return times.length > RATE_MAX;
}

async function withFares(route: { km: number; minutes: number }): Promise<RouteEstimate> {
  try {
    return { ok: true, ...route, fares: await faresForDistance(route.km) };
  } catch (err) {
    console.error("quote fare lookup failed", err);
    return { ok: false, message: "요금 계산 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요." };
  }
}

/** 상차지 → 하차지 도로 거리와 톤수별 예상 운임을 구합니다. */
export async function estimateRoute(origin: string, destination: string): Promise<RouteEstimate> {
  const from = origin.trim().slice(0, 200);
  const to = destination.trim().slice(0, 200);
  if (!from || !to) return { ok: false, message: "상차지와 하차지를 모두 입력해 주세요." };

  const key = `${from}|${to}`;
  const cached = cache.get(key);
  if (cached) return withFares(cached);

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (tooManyRequests(ip)) {
    return { ok: false, message: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." };
  }

  try {
    const [a, b] = await Promise.all([geocode(from), geocode(to)]);
    if (!a) return { ok: false, message: "상차지 주소를 찾지 못했습니다. 주소 찾기로 다시 선택해 주세요." };
    if (!b) return { ok: false, message: "하차지 주소를 찾지 못했습니다. 주소 찾기로 다시 선택해 주세요." };

    const route = await roadDistance(a, b);
    if (!route) return { ok: false, message: "두 주소 사이의 도로 경로를 찾지 못했습니다." };

    if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!);
    cache.set(key, route);
    return await withFares(route);
  } catch (err) {
    console.error("route estimate failed", err);
    return { ok: false, message: "거리 계산 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요." };
  }
}

// 카카오 API (서버 전용 — REST API 키를 쓰므로 클라이언트 컴포넌트에서 import하지 마세요).
//   주소 → 좌표: 카카오 로컬 API (앱 설정에서 카카오맵 사용 설정이 켜져 있어야 합니다)
//   도로 거리:   카카오모빌리티 길찾기 API

type Point = { x: string; y: string };

function authHeaders() {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) throw new Error("KAKAO_REST_API_KEY is not set");
  return { Authorization: `KakaoAK ${key}` };
}

async function searchFirst(path: string, query: string): Promise<Point | null> {
  const url = `https://dapi.kakao.com${path}?size=1&query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: authHeaders(), cache: "no-store" });
  if (!res.ok) throw new Error(`Kakao local ${path} failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { documents: Point[] };
  const first = data.documents[0];
  return first ? { x: first.x, y: first.y } : null;
}

/** 주소(도로명·지번)를 좌표로 바꿉니다. 주소로 못 찾으면 장소명(키워드)으로 한 번 더 찾습니다. */
export async function geocode(address: string) {
  return (
    (await searchFirst("/v2/local/search/address.json", address)) ??
    (await searchFirst("/v2/local/search/keyword.json", address))
  );
}

/** 두 좌표 사이의 자동차 도로 거리(km)와 예상 시간(분). 경로가 없으면 null. */
export async function roadDistance(origin: Point, destination: Point) {
  const url =
    `https://apis-navi.kakaomobility.com/v1/directions` +
    `?origin=${origin.x},${origin.y}&destination=${destination.x},${destination.y}`;
  const res = await fetch(url, { headers: authHeaders(), cache: "no-store" });
  if (!res.ok) throw new Error(`Kakao directions failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as {
    routes: { result_code: number; summary?: { distance: number; duration: number } }[];
  };
  const route = data.routes[0];
  if (!route || route.result_code !== 0 || !route.summary) return null;
  return {
    km: Math.round(route.summary.distance / 100) / 10,
    minutes: Math.round(route.summary.duration / 60),
  };
}

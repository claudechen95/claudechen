export async function GET(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    null;

  const url = ip
    ? `http://ip-api.com/json/${ip}?fields=status,lat,lon,city`
    : `http://ip-api.com/json/?fields=status,lat,lon,city`;

  const geo = await fetch(url).then((r) => r.json()).catch(() => null);

  if (!geo || geo.status !== "success") {
    return Response.json({ status: "fail" });
  }

  return Response.json({ status: "success", lat: geo.lat, lng: geo.lon, city: geo.city ?? "" });
}

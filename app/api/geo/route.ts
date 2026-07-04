function isPrivateIp(ip: string) {
  return (
    ip === "::1" ||
    ip === "127.0.0.1" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
  );
}

export async function GET(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    null;

  const useIp = ip && !isPrivateIp(ip);
  const url = useIp
    ? `http://ip-api.com/json/${ip}?fields=status,lat,lon,city`
    : `http://ip-api.com/json/?fields=status,lat,lon,city`;

  const geo = await fetch(url).then((r) => r.json()).catch(() => null);

  if (!geo || geo.status !== "success") {
    return Response.json({ status: "fail" });
  }

  return Response.json({ status: "success", lat: geo.lat, lng: geo.lon, city: geo.city ?? "" });
}

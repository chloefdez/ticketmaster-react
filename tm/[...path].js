export default async function handler(req, res) {
  const segs = req.query.path;
  const tmPath = Array.isArray(segs) ? `/${segs.join("/")}` : `/${segs || ""}`;

  const tmUrl = new URL(`https://app.ticketmaster.com${tmPath}`);

  // copy all query params except "path"
  for (const [k, v] of Object.entries(req.query)) {
    if (k === "path") continue;
    if (Array.isArray(v))
      v.forEach((val) => tmUrl.searchParams.append(k, String(val)));
    else if (v != null) tmUrl.searchParams.append(k, String(v));
  }

  // inject your secret TM key
  tmUrl.searchParams.set("apikey", process.env.TM_API_KEY);

  const r = await fetch(tmUrl.toString());
  const text = await r.text();

  res
    .status(r.status)
    .setHeader(
      "content-type",
      r.headers.get("content-type") || "application/json"
    )
    .send(text);
}

export default async function handler(req, res) {
  const { path = [], ...rest } = req.query;
  const segs = Array.isArray(path) ? path : [path].filter(Boolean);
  const tmPath = "/" + segs.join("/");

  const tmUrl = new URL(`https://app.ticketmaster.com${tmPath}`);

  // copy all non-path query params
  for (const [k, v] of Object.entries(rest)) {
    if (Array.isArray(v))
      v.forEach((vv) => tmUrl.searchParams.append(k, String(vv)));
    else if (v != null) tmUrl.searchParams.append(k, String(v));
  }

  // inject secret key from Vercel env
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
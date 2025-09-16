const fetch =
  global.fetch ||
  ((...args) => import("node-fetch").then((m) => m.default(...args)));

module.exports = async (req, res) => {
  const tmPath = (req.query.path || "").toString();
  if (!tmPath) {
    res.status(400).json({ error: "Missing 'path' query param" });
    return;
  }

  const tmUrl = new URL(`https://app.ticketmaster.com/${tmPath}`);

  // copy through all query params except 'path'
  for (const [k, v] of Object.entries(req.query)) {
    if (k === "path") continue;
    if (Array.isArray(v))
      v.forEach((val) => tmUrl.searchParams.append(k, String(val)));
    else if (v != null) tmUrl.searchParams.append(k, String(v));
  }
  // inject your secret key from Vercel env
  tmUrl.searchParams.set("apikey", process.env.TM_API_KEY);

  // proxy the request
  const r = await fetch(tmUrl.toString());
  const text = await r.text();
  res
    .status(r.status)
    .setHeader(
      "content-type",
      r.headers.get("content-type") || "application/json"
    )
    .send(text);
};
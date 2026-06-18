/**
 * Versets Clairs — Worker TikTok (Cloudflare Workers)
 * ----------------------------------------------------
 * Petit backend OAuth + Content Posting API pour la démo de review TikTok.
 * Le client_secret reste ici (variable d'env / secret Wrangler), jamais côté front.
 *
 * Endpoints (POST, JSON) :
 *   /exchange  { code }                       -> { access_token, open_id, scope, expires_in }
 *   /publish   { access_token, video_url, caption } -> { publish_id }
 *   /status    { access_token, publish_id }   -> statut de publication
 *
 * Variables d'environnement requises (Wrangler secrets) :
 *   CLIENT_KEY, CLIENT_SECRET, REDIRECT_URI
 */

const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const INIT_URL = "https://open.tiktokapis.com/v2/post/publish/video/init/";
const STATUS_URL = "https://open.tiktokapis.com/v2/post/publish/status/fetch/";

// Origine autorisée à appeler le Worker (le site GitHub Pages).
const ALLOWED_ORIGIN = "https://probe2ka3.github.io";

function cors(extra = {}) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    ...extra,
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors() },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors() });
    }
    if (request.method !== "POST") {
      return json({ error: "method_not_allowed" }, 405);
    }

    const url = new URL(request.url);
    let body = {};
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid_json" }, 400);
    }

    try {
      if (url.pathname === "/exchange") return await exchange(body, env);
      if (url.pathname === "/publish") return await publish(body, env);
      if (url.pathname === "/status") return await status(body, env);
      return json({ error: "not_found" }, 404);
    } catch (err) {
      return json({ error: "server_error", detail: String(err) }, 500);
    }
  },
};

// 1) Échange du code d'autorisation contre un access_token (utilise le secret).
async function exchange(body, env) {
  if (!body.code) return json({ error: "missing_code" }, 400);
  const form = new URLSearchParams({
    client_key: env.CLIENT_KEY,
    client_secret: env.CLIENT_SECRET,
    code: body.code,
    grant_type: "authorization_code",
    redirect_uri: env.REDIRECT_URI,
  });
  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const data = await r.json();
  if (data.error) return json({ error: data.error, detail: data.error_description }, 400);
  return json({
    access_token: data.access_token,
    open_id: data.open_id,
    scope: data.scope,
    expires_in: data.expires_in,
  });
}

// 2) Publication directe (FILE_UPLOAD) : init -> PUT des octets vidéo.
async function publish(body, env) {
  const { access_token, video_url, caption } = body;
  if (!access_token || !video_url) return json({ error: "missing_params" }, 400);

  // Récupère la vidéo (hébergée sur le domaine vérifié) pour connaître sa taille.
  const vid = await fetch(video_url);
  if (!vid.ok) return json({ error: "video_fetch_failed", status: vid.status }, 400);
  const bytes = new Uint8Array(await vid.arrayBuffer());
  const size = bytes.byteLength;

  // Init : un seul chunk (vidéo de démo courte < 64 Mo).
  const initRes = await fetch(INIT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      post_info: {
        title: caption || "",
        privacy_level: "SELF_ONLY", // sandbox : contenu privé (créateur seul)
        disable_comment: false,
        disable_duet: false,
        disable_stitch: false,
      },
      source_info: {
        source: "FILE_UPLOAD",
        video_size: size,
        chunk_size: size,
        total_chunk_count: 1,
      },
    }),
  });
  const initData = await initRes.json();
  if (initData.error && initData.error.code && initData.error.code !== "ok") {
    return json({ error: "init_failed", detail: initData.error }, 400);
  }
  const uploadUrl = initData.data && initData.data.upload_url;
  const publishId = initData.data && initData.data.publish_id;
  if (!uploadUrl) return json({ error: "no_upload_url", detail: initData }, 400);

  // PUT des octets vidéo vers l'upload_url fourni par TikTok.
  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(size),
      "Content-Range": `bytes 0-${size - 1}/${size}`,
    },
    body: bytes,
  });
  if (!put.ok && put.status !== 201) {
    return json({ error: "upload_failed", status: put.status }, 400);
  }
  return json({ publish_id: publishId, video_size: size });
}

// 3) Statut de la publication.
async function status(body, env) {
  const { access_token, publish_id } = body;
  if (!access_token || !publish_id) return json({ error: "missing_params" }, 400);
  const r = await fetch(STATUS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({ publish_id }),
  });
  return json(await r.json());
}

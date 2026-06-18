/**
 * Versets Clairs — Worker TikTok + Scheduler (Cloudflare Workers)
 * ---------------------------------------------------------------
 * - OAuth (client_secret jamais côté front), tokens stockés en KV + refresh auto.
 * - File d'attente de publications programmées + Cron Trigger qui poste à l'heure dite
 *   (TikTok n'a PAS de programmation native : on la fait nous-mêmes via Direct Post).
 *
 * Bindings requis (wrangler.toml) :
 *   KV namespace  -> env.VC
 *   Vars          -> REDIRECT_URI, VIDEO_BASE, ALLOWED_ORIGIN
 *   Secrets       -> CLIENT_KEY, CLIENT_SECRET, ADMIN_KEY
 *   Cron          -> ex "*\/5 * * * *"
 *
 * Endpoints (POST JSON) :
 *   /exchange  { code }                          (public) -> stocke les tokens
 *   /me                                          (admin)  -> état connexion
 *   /publish   { name|video_url, caption }       (admin)  -> Direct Post immédiat
 *   /queue/list                                  (admin)  -> file complète
 *   /queue/add { name|video_url, caption, scheduled_at } (admin)
 *   /queue/remove { id }                         (admin)
 *   /status    { publish_id }                    (admin)  -> statut TikTok
 */

const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const CREATOR_INFO_URL = "https://open.tiktokapis.com/v2/post/publish/creator_info/query/";
const INIT_URL = "https://open.tiktokapis.com/v2/post/publish/video/init/";
const STATUS_URL = "https://open.tiktokapis.com/v2/post/publish/status/fetch/";

function cors(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key",
  };
}
function json(data, env, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors(env) },
  });
}

// ---------- KV helpers ----------
async function getTokens(env) {
  const raw = await env.VC.get("tokens");
  return raw ? JSON.parse(raw) : null;
}
async function putTokens(env, t) {
  await env.VC.put("tokens", JSON.stringify(t));
}
async function getQueue(env) {
  const raw = await env.VC.get("queue");
  return raw ? JSON.parse(raw) : [];
}
async function putQueue(env, q) {
  await env.VC.put("queue", JSON.stringify(q));
}

// ---------- OAuth ----------
async function exchange(code, env) {
  const form = new URLSearchParams({
    client_key: env.CLIENT_KEY,
    client_secret: env.CLIENT_SECRET,
    code,
    grant_type: "authorization_code",
    redirect_uri: env.REDIRECT_URI,
  });
  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error_description || d.error);
  const now = Date.now();
  const tokens = {
    access_token: d.access_token,
    refresh_token: d.refresh_token,
    open_id: d.open_id,
    scope: d.scope,
    expires_at: now + (d.expires_in || 86400) * 1000,
    refresh_expires_at: now + (d.refresh_expires_in || 31536000) * 1000,
  };
  await putTokens(env, tokens);
  return tokens;
}

async function refresh(env, tokens) {
  const form = new URLSearchParams({
    client_key: env.CLIENT_KEY,
    client_secret: env.CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: tokens.refresh_token,
  });
  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error_description || d.error);
  const now = Date.now();
  const t = {
    access_token: d.access_token,
    refresh_token: d.refresh_token || tokens.refresh_token,
    open_id: d.open_id || tokens.open_id,
    scope: d.scope || tokens.scope,
    expires_at: now + (d.expires_in || 86400) * 1000,
    refresh_expires_at: now + (d.refresh_expires_in || 31536000) * 1000,
  };
  await putTokens(env, t);
  return t;
}

// access_token valide (refresh si < 2 min de marge)
async function validToken(env) {
  let t = await getTokens(env);
  if (!t) throw new Error("not_connected");
  if (Date.now() > t.expires_at - 120000) t = await refresh(env, t);
  return t;
}

// ---------- Content Posting (FILE_UPLOAD) ----------
function resolveVideoUrl(env, item) {
  if (item.video_url) return item.video_url;
  return (env.VIDEO_BASE || "").replace(/\/$/, "") + "/" + item.name;
}

async function publishOne(env, accessToken, videoUrl, caption) {
  const creatorRes = await fetch(CREATOR_INFO_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
  });
  const creatorData = await creatorRes.json();
  const creatorError = creatorData.error && creatorData.error.code !== "ok";
  if (!creatorRes.ok || creatorError) {
    throw new Error("creator_info_failed_" + JSON.stringify(creatorData.error || creatorData));
  }
  const creator = creatorData.data || {};
  const privacyOptions = creator.privacy_level_options || [];
  const privacyLevel = privacyOptions.includes("SELF_ONLY")
    ? "SELF_ONLY"
    : privacyOptions[privacyOptions.length - 1];
  if (!privacyLevel) throw new Error("privacy_level_unavailable");

  const vid = await fetch(videoUrl);
  if (!vid.ok) throw new Error("video_fetch_failed_" + vid.status);
  const bytes = new Uint8Array(await vid.arrayBuffer());
  const size = bytes.byteLength;

  const initRes = await fetch(INIT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      post_info: {
        title: caption || "",
        privacy_level: privacyLevel,
        disable_comment: Boolean(creator.comment_disabled),
        disable_duet: Boolean(creator.duet_disabled),
        disable_stitch: Boolean(creator.stitch_disabled),
        brand_content_toggle: false,
        brand_organic_toggle: false,
        is_aigc: false,
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
  const uploadUrl = initData.data && initData.data.upload_url;
  const publishId = initData.data && initData.data.publish_id;
  if (!uploadUrl) throw new Error("init_failed_" + JSON.stringify(initData.error || initData));

  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(size),
      "Content-Range": `bytes 0-${size - 1}/${size}`,
    },
    body: bytes,
  });
  if (!put.ok && put.status !== 201) throw new Error("upload_failed_" + put.status);
  return publishId;
}

// ---------- HTTP ----------
function adminOk(request, env) {
  return request.headers.get("X-Admin-Key") === env.ADMIN_KEY;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: cors(env) });
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, env, 405);

    const path = new URL(request.url).pathname;
    let body = {};
    try { body = await request.json(); } catch { body = {}; }

    try {
      // Public : callback OAuth
      if (path === "/exchange") {
        if (!body.code) return json({ error: "missing_code" }, env, 400);
        const t = await exchange(body.code, env);
        return json({ ok: true, open_id: t.open_id, scope: t.scope }, env);
      }

      // À partir d'ici : réservé admin
      if (!adminOk(request, env)) return json({ error: "unauthorized" }, env, 401);

      if (path === "/me") {
        const t = await getTokens(env);
        return json({
          connected: !!t,
          open_id: t ? t.open_id : null,
          scope: t ? t.scope : null,
          expires_at: t ? t.expires_at : null,
        }, env);
      }

      if (path === "/publish") {
        const t = await validToken(env);
        const url = resolveVideoUrl(env, body);
        const publishId = await publishOne(env, t.access_token, url, body.caption || "");
        return json({ ok: true, publish_id: publishId }, env);
      }

      if (path === "/queue/list") {
        return json({ queue: await getQueue(env) }, env);
      }
      if (path === "/queue/add") {
        if (!body.name && !body.video_url) return json({ error: "missing_video" }, env, 400);
        if (!body.scheduled_at) return json({ error: "missing_scheduled_at" }, env, 400);
        const q = await getQueue(env);
        const item = {
          id: (Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
          name: body.name || null,
          video_url: body.video_url || null,
          caption: body.caption || "",
          scheduled_at: Number(body.scheduled_at), // epoch ms
          status: "pending",
          publish_id: null,
          posted_at: null,
          error: null,
        };
        q.push(item);
        q.sort((a, b) => a.scheduled_at - b.scheduled_at);
        await putQueue(env, q);
        return json({ ok: true, item }, env);
      }
      if (path === "/queue/remove") {
        const q = (await getQueue(env)).filter((x) => x.id !== body.id);
        await putQueue(env, q);
        return json({ ok: true }, env);
      }
      if (path === "/status") {
        const t = await validToken(env);
        const r = await fetch(STATUS_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${t.access_token}`, "Content-Type": "application/json; charset=UTF-8" },
          body: JSON.stringify({ publish_id: body.publish_id }),
        });
        return json(await r.json(), env);
      }

      return json({ error: "not_found" }, env, 404);
    } catch (e) {
      return json({ error: "server_error", detail: String(e.message || e) }, env, 500);
    }
  },

  // Cron Trigger : poste les vidéos dues.
  async scheduled(event, env, ctx) {
    const q = await getQueue(env);
    const due = q.filter((x) => x.status === "pending" && x.scheduled_at <= Date.now());
    if (!due.length) return;
    let token;
    try { token = await validToken(env); }
    catch (e) {
      // pas de token : marque les dues en échec explicite
      for (const it of due) { it.status = "failed"; it.error = "not_connected"; }
      await putQueue(env, q);
      return;
    }
    for (const it of due) {
      try {
        const url = resolveVideoUrl(env, it);
        it.publish_id = await publishOne(env, token.access_token, url, it.caption);
        it.status = "posted";
        it.posted_at = Date.now();
      } catch (e) {
        it.status = "failed";
        it.error = String(e.message || e);
      }
      await putQueue(env, q); // sauvegarde après chaque post (idempotence)
    }
  },
};

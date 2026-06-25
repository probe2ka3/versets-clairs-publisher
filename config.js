// ============================================================
// Kassos Versets Clairs — configuration publique (PRODUCTION)
// ------------------------------------------------------------
// Valeurs PUBLIQUES (transitent dans l'URL d'autorisation TikTok ou les
// appels front). Le client_secret N'EST PAS ici : il vit uniquement dans le
// Worker Cloudflare (secret). Pour passer en production, le secret du Worker
// doit aussi être le CLIENT_SECRET de PRODUCTION (régénéré) :
//   npx wrangler secret put CLIENT_SECRET
// ============================================================
window.VC_CONFIG = {
  // Client key SANDBOX (pour la review — app non encore approuvée).
  // Après approbation TikTok : repasser sur la clé PRODUCTION "awppijs4vpz11u1s"
  // + mettre le CLIENT_SECRET de production (régénéré) sur le Worker.
  CLIENT_KEY: "sbawurg5htshac823m",

  // Worker Cloudflare déployé (sans slash final).
  WORKER_URL: "https://versets-clairs-tiktok.probe2-ka3.workers.dev",

  // Doit correspondre EXACTEMENT à la Redirect URI enregistrée dans le portail.
  REDIRECT_URI:
    "https://versetsclairs.kassos.art/auth/tiktok/callback.html",

  // Scopes demandés (cochés dans le portail).
  SCOPES: "user.info.basic,video.publish,video.upload",

  // Base publique R2 où sont hébergées les 95 vidéos (préfixe des noms du manifeste).
  VIDEO_BASE: "https://pub-8c08c849e3034768a7f988ef54ab308d.r2.dev",

  // Manifeste des vidéos prêtes (vidéos + captions), servi sur le même domaine.
  MANIFEST_URL: "https://versetsclairs.kassos.art/manifest.json",
};

// ============================================================
// Versets Clairs Publisher — configuration publique
// ------------------------------------------------------------
// Ces valeurs sont PUBLIQUES (elles transitent dans l'URL d'autorisation
// TikTok ou les appels front). Le client_secret N'EST PAS ici : il vit
// uniquement dans le Worker Cloudflare (variable d'environnement).
// ============================================================
window.VC_CONFIG = {
  // Client key de l'app TikTok (onglet Credentials du portail développeur).
  // À COLLER : copier la "Client key" depuis https://developers.tiktok.com
  CLIENT_KEY: "sbawurg5htshac823m",

  // URL publique du Worker Cloudflare déployé (sans slash final).
  // Ex : https://versets-clairs-tiktok.<sous-domaine>.workers.dev
  WORKER_URL: "https://versets-clairs-tiktok.probe2-ka3.workers.dev",

  // Doit correspondre EXACTEMENT à la Redirect URI enregistrée dans le portail.
  REDIRECT_URI:
    "https://probe2ka3.github.io/versets-clairs-publisher/auth/tiktok/callback.html",

  // Scopes demandés (cochés dans le portail).
  SCOPES: "user.info.basic,video.publish,video.upload",

  // Vidéo de démonstration à publier (hébergée sur le même domaine vérifié).
  DEMO_VIDEO_URL:
    "https://probe2ka3.github.io/versets-clairs-publisher/demo-video.mp4",
  DEMO_CAPTION:
    "Verset clair — court rappel. #fyp #coran #rappel #versetsclairs",
};

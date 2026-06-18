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

  // Vidéos de démonstration à publier (hébergées sur le même domaine vérifié).
  DEMO_VIDEOS: [
    {
      title: "Rappel court",
      url: "https://probe2ka3.github.io/versets-clairs-publisher/demo-video.mp4",
      caption: "Verset clair — court rappel. #fyp #coran #rappel #versetsclairs",
    },
    {
      title: "Sourate 2, verset 163",
      url: "https://probe2ka3.github.io/versets-clairs-publisher/demo-video-2.mp4",
      caption:
        "Un verset à écouter avec attention.\nEt votre Divinité est une divinité unique.\nÀ partir de Sourate 2, verset 163.\n\n#fyp #islam #versetdujour #coran #rappel",
    },
    {
      title: "Sourate 2, verset 43",
      url: "https://probe2ka3.github.io/versets-clairs-publisher/demo-video-3.mp4",
      caption:
        "Un verset pour nourrir la réflexion.\nEt accomplissez la prière, et acquittez l'aumône, et inclinez-vous avec ceux qui s’inclinent.\nÀ partir de Sourate 2, verset 43.\n\n#fyp #quran #islam #meditation #versetsclairs",
    },
  ],
};

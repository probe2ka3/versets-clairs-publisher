# Handoff Codex - Versets Clairs Publisher

Date : 2026-06-18

## Etat actuel
- App TikTok production soumise en review (`In review`).
- Demo video produite et uploadee dans TikTok Developer.
- Site GitHub Pages public :
  - https://probe2ka3.github.io/versets-clairs-publisher/
  - https://probe2ka3.github.io/versets-clairs-publisher/app.html
  - https://probe2ka3.github.io/versets-clairs-publisher/schedule.html
- Worker Cloudflare deploye :
  - https://versets-clairs-tiktok.probe2-ka3.workers.dev
- KV Cloudflare cree :
  - binding `VC`
  - id `722a25957cd147189f6d7267788df74f`
- Login TikTok sandbox fonctionne.
- Direct Post sandbox fonctionne si le compte TikTok cible est prive.
- `app.html` permet maintenant :
  - choisir une video demo parmi 3,
  - charger automatiquement sa caption,
  - modifier la caption avant publication,
  - publier via le Worker.

## Commits importants du publisher
- `feat: brancher le worker cloudflare`
- `fix: utiliser la cle sandbox tiktok`
- `fix: valider la connexion sandbox tiktok`
- `fix: connecter le publisher au worker`
- `fix: respecter la confidentialite tiktok sandbox`
- `feat: ajouter plusieurs videos demo editables`

## Videos demo actuellement sur GitHub Pages
Ces fichiers sont temporaires pour la review TikTok :
- `demo-video.mp4`
- `demo-video-2.mp4`
- `demo-video-3.mp4`

Pour la production, les videos doivent aller sur Cloudflare R2.

## Scheduler
Le scheduler est deja present :
- `manifest.json` contient 95 videos/captions.
- `schedule.html` charge le manifeste.
- Le Worker expose :
  - `/queue/list`
  - `/queue/add`
  - `/queue/remove`
  - cron toutes les 5 minutes.
- `ADMIN_KEY` est configure cote Cloudflare.

## Blocage R2 actuel
Wrangler est connecte a Cloudflare, mais R2 n'est pas encore active sur le compte.

Commande testee :
```powershell
npx.cmd wrangler r2 bucket list
```

Erreur :
```text
Please enable R2 through the Cloudflare Dashboard. [code: 10042]
```

## Prochaine etape R2
1. Activer R2 dans le dashboard Cloudflare.
2. Creer un bucket `versets-clairs`.
3. Activer l'acces public `r2.dev` du bucket.
4. Uploader les MP4 :
```powershell
cd C:\Users\Rexhep\Desktop\versets-clairs-publisher
.\scripts\upload-r2.ps1 -Bucket versets-clairs
```
5. Copier l'URL publique R2 dans `worker/wrangler.toml` :
```toml
VIDEO_BASE = "https://pub-xxxx.r2.dev"
```
6. Redeployer :
```powershell
cd C:\Users\Rexhep\Desktop\versets-clairs-publisher\worker
npx.cmd wrangler deploy
```

## Important
- Ne pas nettoyer les secrets : l'utilisateur a explicitement demande de ne pas le faire.
- Les videos FR sont terminees et rangees dans :
  - `C:\Users\Rexhep\Desktop\claude-remote-test\renders\local\ordered`
- Garder les noms exacts des MP4 dans R2, car `manifest.json` reference ces noms.

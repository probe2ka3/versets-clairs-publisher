# Scheduler Versets Clairs (Cloudflare) — programmation des publications

⚠️ Utile **après** l'approbation TikTok : en sandbox / app non auditée, les posts
sont privés. Mais tu peux tout configurer et tester dès maintenant (posts privés).

TikTok n'a **pas** de programmation native → c'est le Worker (Cron Trigger) qui
poste à l'heure dite via Direct Post.

## Vue d'ensemble
- `manifest.json` : 95 vidéos + captions (généré par `scripts/gen_manifest.py`).
- `schedule.html` : UI — charge le manifeste, auto-planifie (heures de pointe), gère la file.
- `worker/` : Worker — KV (tokens + file), cron toutes les 5 min, refresh token auto.
- Vidéos : hébergées sur **Cloudflare R2** (le Worker récupère les octets pour Direct Post).

## 1. Régénérer le manifeste (à chaque nouveau lot de vidéos)
```bash
python scripts/gen_manifest.py        # -> _publisher/manifest.json
# puis committer/pousser manifest.json sur le repo publisher
```

## 2. Héberger les vidéos sur R2 (gratuit, 10 Go)
État actuel : le compte Cloudflare est connecté à Wrangler, mais R2 n'est pas encore
activé sur le compte. `wrangler r2 bucket list` retourne :
`Please enable R2 through the Cloudflare Dashboard. [code: 10042]`

À faire une seule fois dans le dashboard Cloudflare :
1. Cloudflare → R2 → activer R2 sur le compte.
2. Créer un bucket `versets-clairs` (ou via `npx.cmd wrangler r2 bucket create versets-clairs`).
3. Activer l'accès public `r2.dev` du bucket → on obtient une base type `https://pub-xxxx.r2.dev`.

Puis uploader les MP4 de `renders/local/ordered/` avec les noms EXACTS du manifeste :
```powershell
cd C:\Users\Rexhep\Desktop\versets-clairs-publisher
.\scripts\upload-r2.ps1 -Bucket versets-clairs
```

Contrôle à faire après upload :
```powershell
npx.cmd wrangler r2 object get versets-clairs/01-1-video-pack01-112-1-4-fr.mp4 --file $env:TEMP\r2-check.mp4
```

Enfin, mettre la base publique R2 dans `worker/wrangler.toml` :
```toml
VIDEO_BASE = "https://pub-xxxx.r2.dev"
```

Puis redéployer :
```powershell
cd C:\Users\Rexhep\Desktop\versets-clairs-publisher\worker
npx.cmd wrangler deploy
```

## 3. Créer le stockage KV
```bash
cd worker
npx wrangler kv namespace create VC
# copier l'id affiché dans wrangler.toml -> [[kv_namespaces]] id = "..."
```

## 4. Secrets + déploiement
```bash
npx wrangler secret put CLIENT_KEY      # client key TikTok
npx wrangler secret put CLIENT_SECRET   # client secret TikTok
npx wrangler secret put ADMIN_KEY       # mot de passe que TU choisis pour l'UI
npx wrangler deploy
```
→ Mettre l'URL du Worker dans `config.js` (`WORKER_URL`) si pas déjà fait.

## 5. Connecter TikTok (une fois)
Ouvre `index.html` → **Continue with TikTok** → autorise (compte sandbox).
Le Worker stocke le token en KV (et le rafraîchit tout seul).

## 6. Programmer
Ouvre `schedule.html` :
1. Saisis l'**ADMIN_KEY** (celui de l'étape 4) → « OK » (statut connexion s'affiche).
2. Les 95 vidéos + captions sont déjà chargées.
3. **Auto-planifier** (répartit aux heures de pointe, N/jour) — ou règle chaque date.
4. **Tout mettre en file** (ou « File » par vidéo).
5. Le cron poste automatiquement aux heures prévues ; la file montre `pending`/`posted`/`failed`.

## Notes
- 1 seul compte pour l'instant (FR). Multi-langues = un Worker/clé par compte, ou étendre KV
  pour stocker un token par langue (évolution).
- Quotas TikTok : poster avec marge (le cron tourne toutes les 5 min, 1 vidéo à la fois).

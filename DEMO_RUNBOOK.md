# Démo TikTok — déploiement + tournage de la vidéo de review

Objectif : obtenir une **vidéo démo** montrant le flux complet (Login Kit →
Content Posting API / Direct Post) en **sandbox**, à uploader dans le portail
développeur TikTok pour « Submit for review ».

L'app a 3 morceaux :
- **Frontend** (déjà en ligne, GitHub Pages) : `index.html`, `auth/tiktok/callback.html`, `app.html`, `config.js`.
- **Backend** : un Worker Cloudflare (`worker/worker.js`) qui détient le `client_secret`.
- **Vidéo de contenu** : `demo-video.mp4` (hébergée sur le domaine vérifié).

---

## 1. Renseigner `config.js` (valeurs publiques)

Dans `config.js`, remplacer :
- `CLIENT_KEY` → la **Client key** (portail TikTok → onglet Credentials, icône œil).
  *(Public : elle transite dans l'URL d'autorisation.)*
- `WORKER_URL` → l'URL du Worker (obtenue à l'étape 2).

---

## 2. Déployer le Worker Cloudflare (gratuit)

Prérequis : un compte Cloudflare (gratuit), Node installé.

```bash
cd worker
npm i -g wrangler          # ou: npx wrangler ...
npx wrangler login         # ouvre le navigateur, autorise

# Secrets (jamais dans le code) :
npx wrangler secret put CLIENT_KEY       # coller la Client key
npx wrangler secret put CLIENT_SECRET    # coller le Client secret (portail)

npx wrangler deploy        # publie le Worker
```

`wrangler deploy` affiche l'URL publique, du type
`https://versets-clairs-tiktok.<sous-domaine>.workers.dev`.
→ La coller dans `config.js` (`WORKER_URL`, **sans** slash final), puis
committer + pousser `config.js` (GitHub Pages se met à jour en ~1 min).

> Si l'origine du site n'est pas `https://probe2ka3.github.io`, ajuster
> `ALLOWED_ORIGIN` en tête de `worker.js`.

---

## 3. Sandbox TikTok — autoriser un compte test

Dans le portail développeur, onglet **Sandbox** (en haut de l'app) :
1. Créer / ouvrir le sandbox de l'app.
2. **Add target users** → ajouter le compte TikTok qui servira à la démo
   (ton propre compte). En sandbox, seul un *target user* peut autoriser l'app.
3. Vérifier que les scopes `user.info.basic`, `video.publish`, `video.upload`
   sont actifs dans le sandbox.

> En sandbox, tout post est **privé** (visible seulement par le créateur) —
> c'est normal et attendu par la review.

---

## 4. Tourner la vidéo démo (screen recording)

Lancer un enregistreur d'écran (Xbox Game Bar `Win+G`, OBS, ou autre), puis,
dans le navigateur :

1. Ouvrir `https://probe2ka3.github.io/versets-clairs-publisher/`.
2. Cliquer **Continue with TikTok** → page d'autorisation TikTok.
3. Se connecter avec le **compte test sandbox** et **autoriser** les scopes.
4. Retour sur `callback` → « Connected to TikTok » → **Continue to publisher**.
5. Sur `app.html` : la vidéo + la caption s'affichent → cliquer
   **Direct Post to TikTok**.
6. Attendre « Sent to TikTok ✓ publish_id … ».
7. (Optionnel) montrer le brouillon/post privé dans l'app TikTok.

Conseils review :
- Montrer clairement l'**URL** du site (le domaine doit matcher l'app).
- Montrer chaque **scope** sur l'écran d'autorisation.
- Garder la souris/les clics visibles.
- Format **mp4/mov**, ≤ 50 Mo, ≤ 5 fichiers.

---

## 5. Uploader + soumettre

Portail → section **App review** → *Upload demo video* → déposer
l'enregistrement → **Save** → **Submit for review**.

---

## Endpoints du Worker (référence)

- `POST /exchange { code }` → `{ access_token, open_id, scope, expires_in }`
- `POST /publish { access_token, video_url, caption }` → `{ publish_id }`
  (FILE_UPLOAD : le Worker télécharge `demo-video.mp4` et le PUT vers TikTok)
- `POST /status { access_token, publish_id }` → statut de publication

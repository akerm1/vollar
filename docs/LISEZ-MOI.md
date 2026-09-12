# Caisse (Point de Vente) — Guide d'installation et d'utilisation

Application de caisse complète pour commerces (vêtements, textile, général) : vente, stock, clients, fournisseurs, promotion, rapports Z, sauvegarde automatique.

**Aucune installation requise** — tout fonctionne dans le navigateur (Chrome / Edge recommandés).

---

## 1. Démarrer la caisse

**Aucune installation** — la caisse fonctionne dans le navigateur **Chrome ou Edge** (recommandés). Trois façons de lancer :

1. **Raccourci « Demarrer-Samtex.bat » (recommandé)** : double-cliquez dessus. Il utilise **PowerShell**, déjà présent sur Windows (aucun logiciel à installer), lance un petit serveur local et ouvre la caisse automatiquement dans votre navigateur. Laissez la fenêtre noire ouverte pendant l'utilisation, puis fermez-la pour arrêter.
2. **Double-cliquez sur `index.html`** : la caisse s'ouvre directement dans le navigateur. Aucun serveur nécessaire.
3. **Développeurs** : VS Code → « Go Live » (extension *Live Server*), ou `http.server` / `http-server`.

---

## 2. Première utilisation

1. À l'ouverture, l'écran **« Bienvenue »** vous demande :
   - le **nom du magasin** (affiché sur l'écran, les tickets et les rapports),
   - un **dossier de sauvegarde automatique** (recommandé : créez un dossier « Sauvegardes caisse »).
2. Connectez-vous avec le profil **Administrateur** et le code par défaut **0000**.
3. La caisse **exige de changer ce code PIN immédiatement** : choisissez un code de 4 à 6 chiffres (0000 est refusé).
4. La caisse est prête. Vous pouvez créer des caissiers et gérants dans **Paramètres → Utilisateurs**.

> ⚠️ Ne gardez jamais le code 0000 en production : il est connu de tous.

---

## 3. Lecteur de code-barres

- **USB, Bluetooth ou 2G/4G** : tout lecteur « clavier HID » fonctionne sans rien installer (la majorité du marché : laser 1D, imager 2D, lecteurs QR).
- Testez votre lecteur dans **Paramètres → Scanner** : champ *« Test de scan »* → le code nettoyé s'affiche en direct.
- Si le code affiché contient des caractères parasites, ajustez **Préfixes à ignorer** ou **Suffixe de fin** dans ces mêmes réglages.
- Saisie manuelle : tapez directement un code ou le nom d'un article à la caisse.

---

## 4. Faire une vente

1. Dans la vue **Caisse**, scannez un article (ou cliquez sur le produit).
2. Validez la quantité si besoin, puis cliquez **Valider / Encaisser**.
3. Choisissez le paiement (espèces, carte, crédit/dette) et concluez.
4. Le ticket s'imprime (voir §6) et le stock est mis à jour automatiquement.

---

## 5. Sauvegardes et restauration

- La caisse **sauvegarde automatiquement** dans le dossier choisi (ou en téléchargement) au démarrage, toutes les 12 h et à la fermeture.
- **Exporter** : Paramètres → Sauvegarde → « Exporter une sauvegarde complète » (fichier JSON).
- **Restaurer** : Paramètres → Sauvegarde → « Importer » et choisissez le fichier JSON. L'import est sécurisé : une copie de secours est faite avant, et en cas de problème vos données d'origine sont restaurées automatiquement.
- **Nouvel ordinateur** : copiez le dossier de sauvegarde (ou le fichier JSON exporté) vers le nouveau PC, puis importez.

> La restauration automatique à vide s'appuie sur le dossier de sauvegarde choisi. Conservez ce dossier.

**Où sont stockées les données ?** Tout est enregistré automatiquement dans le navigateur (IndexedDB), aucune configuration nécessaire — c'est le choix le plus simple et le plus sûr.

---

## 6. Impression des tickets

- L'impression passe par la **boîte de dialogue d'impression du navigateur** (Windows).
- Une imprimante thermique 80 mm fonctionne si elle est installée comme imprimante Windows (pilote) et choisie par défaut.
- Pour l'impression directe sans dialogue (découpe automatique), un composant complémentaire (QZ Tray) est requis — contactez votre revendeur.

---

## 7. Limites à connaître

- La caisse est **100 % locale et hors ligne** : les données restent sur l'ordinateur (navigateur ou dossier choisi). Pas de synchronisation entre plusieurs caisses.
- Chaque ordinateur = sa propre base de données. Pour un parc multi-caisses, utilisez la sauvegarde/restauration par fichier.

---

## 8. Remettre la caisse à neuf (cession / nouveau client)

Paramètres → Système → **« Réinitialiser toutes les données »** :

1. Une sauvegarde est créée automatiquement avant l'effacement.
2. Vous devez taper **RÉINITIALISER** pour confirmer.
3. Toutes les données (ventes, stock, clients, utilisateurs, audit…) sont effacées et la caisse repart vide avec l'assistant de bienvenue.

---

## 9. Support

Pour tout problème, notez :
- le navigateur et sa version,
- les messages affichés à l'écran,
- l'étape exacte où le problème apparaît.

---

*Point de Vente — logiciel local, sécurisé et hors ligne.*

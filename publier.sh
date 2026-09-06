#!/usr/bin/env bash
#
# publier.sh — met en ligne une nouvelle version du guide 7ème compagnie.
#
# Pourquoi ce script existe : le numéro de version vit à DEUX endroits
# (index.html et sw.js) et les deux doivent toujours être identiques. Si sw.js
# garde l'ancien numéro, le téléphone de papa continue d'afficher l'ancienne
# version pour toujours — le cache n'est purgé que quand son nom change.
# Ce script synchronise les deux, vérifie, publie. Rien à retenir.
#
# Usage :
#   ./publier.sh 1.2.0 "ce que j'ai changé"
#   ./publier.sh              → montre la version actuelle et s'arrête
#
set -euo pipefail

DOSSIER="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DOSSIER"

rouge() { printf '\033[31m%s\033[0m\n' "$*"; }
vert()  { printf '\033[32m%s\033[0m\n' "$*"; }
gras()  { printf '\033[1m%s\033[0m\n' "$*"; }

version_actuelle() {
    grep -oP "(?<=^const VERSION = ')[^']+" index.html | head -1
}

# --- Sans argument : on informe et on s'arrête -----------------------------
if [ $# -eq 0 ]; then
    gras "Guide 7ème compagnie"
    echo "  version actuelle : $(version_actuelle)"
    echo "  en ligne         : https://spicyrelax.github.io/7eme-compagnie-guide/"
    echo
    echo "Pour publier une nouvelle version :"
    echo "  ./publier.sh 1.2.0 \"ce que j'ai changé\""
    exit 0
fi

NOUVELLE="$1"
MESSAGE="${2:-Mise à jour du guide}"

# --- Contrôles avant de toucher à quoi que ce soit -------------------------
if ! [[ "$NOUVELLE" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    rouge "⛔ Version invalide : « $NOUVELLE » — il faut la forme 1.2.0"
    exit 1
fi

ACTUELLE="$(version_actuelle)"
if [ "$NOUVELLE" = "$ACTUELLE" ]; then
    rouge "⛔ La version $NOUVELLE est déjà celle en place."
    rouge "   Il FAUT un numéro différent, sinon la mise à jour n'arrivera"
    rouge "   jamais sur le téléphone (le cache ne serait pas purgé)."
    exit 1
fi

for f in index.html sw.js; do
    [ -f "$f" ] || { rouge "⛔ $f introuvable"; exit 1; }
done

# --- Remplacement de la version dans les deux fichiers ---------------------
gras "→ $ACTUELLE  ➜  $NOUVELLE"
sed -i "s/^const VERSION = '[^']*';/const VERSION = '$NOUVELLE';/" index.html sw.js

# --- Vérification : les deux fichiers doivent être d'accord ---------------
V_INDEX="$(grep -oP "(?<=^const VERSION = ')[^']+" index.html | head -1)"
V_SW="$(grep -oP "(?<=^const VERSION = ')[^']+" sw.js | head -1)"

if [ "$V_INDEX" != "$NOUVELLE" ] || [ "$V_SW" != "$NOUVELLE" ]; then
    rouge "⛔ Échec de la synchronisation — rien n'est publié."
    rouge "   index.html = $V_INDEX / sw.js = $V_SW"
    git checkout -- index.html sw.js
    rouge "   Fichiers remis dans leur état d'origine."
    exit 1
fi
vert "✅ index.html et sw.js sont sur $NOUVELLE"

# --- Publication -----------------------------------------------------------
git add -A
git commit -q -m "v$NOUVELLE — $MESSAGE"
git push -q origin main

vert "✅ Publié en v$NOUVELLE"
echo
echo "  https://spicyrelax.github.io/7eme-compagnie-guide/"
echo "  (GitHub met environ une minute à rafraîchir le site)"
echo
echo "  Sur le téléphone : rouvrir l'app deux fois, ou attendre le bandeau"
echo "  « Nouvelle version disponible » puis toucher « Mettre à jour »."

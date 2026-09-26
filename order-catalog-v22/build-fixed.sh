#!/usr/bin/env bash
set -euo pipefail
rm -rf public /tmp/oc /tmp/products_v21.zip
mkdir -p public /tmp/oc
cp order-catalog-v21/index.html public/index.html
cp order-catalog-v21/app.js public/app.js
cp order-catalog-v22/cloud-render.js public/cloud.js
cp order-catalog-v22/filters-v23.js public/filters-v23.js
cp order-catalog-v22/admin-v23.html public/admin-v23.html
cp order-catalog-v22/admin-v23.js public/admin-v23.js
printf 'window.FIREBASE_CONFIG={};' > public/firebase-config.js
curl -L -sS https://order-catalog-api-v22.onrender.com/api/products -o public/catalog.json
curl -L -sS https://order-catalog-v22.onrender.com/styles.css -o public/styles.css
python3 - <<'PY'
p='public/index.html'
s=open(p,encoding='utf-8').read()
s=s.replace('</body>','<script src="filters-v23.js"></script></body>')
s=s.replace('href="admin.html"','href="admin-v23.html"')
open(p,'w',encoding='utf-8').write(s)
PY
curl -L -sS "$ASSET_URL" -o /tmp/products_v21.zip
unzip -q /tmp/products_v21.zip -d /tmp/oc
cp -R /tmp/oc/products public/products
test -s public/products/p001.jpg
test -s public/products/p050.jpg
test -s public/products/p150.jpg
test -s public/products/p295.jpg
file public/products/p001.jpg public/products/p050.jpg public/products/p150.jpg public/products/p295.jpg

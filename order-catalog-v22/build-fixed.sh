#!/usr/bin/env bash
set -euo pipefail
rm -rf public /tmp/oc /tmp/products_v21.zip
mkdir -p public /tmp/oc
cp order-catalog-v21/index.html public/index.html
cp order-catalog-v21/app.js public/app.js
cp order-catalog-v22/cloud-render.js public/cloud.js
printf 'window.FIREBASE_CONFIG={};' > public/firebase-config.js
curl -L -sS https://order-catalog-api-v22.onrender.com/api/products -o public/catalog.json
curl -L -sS https://order-catalog-v22.onrender.com/styles.css -o public/styles.css
curl -L -sS "$ASSET_URL" -o /tmp/products_v21.zip
unzip -q /tmp/products_v21.zip -d /tmp/oc
cp -R /tmp/oc/products public/products
test -s public/products/p001.jpg
test -s public/products/p050.jpg
test -s public/products/p150.jpg
test -s public/products/p295.jpg
file public/products/p001.jpg public/products/p050.jpg public/products/p150.jpg public/products/p295.jpg

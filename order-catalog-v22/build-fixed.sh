#!/usr/bin/env bash
set -euo pipefail
rm -rf public
mkdir -p public/products

# Buyer storefront V2.13
cp order-catalog-v22/buyer-v26.html public/index.html
{ cat order-catalog-v22/buyer-v26.js; printf '\n'; cat order-catalog-v22/buyer-v27-fix.js; printf '\n'; cat order-catalog-v22/buyer-v28-fix.js; printf '\n'; cat order-catalog-v22/buyer-v29-tier.js; } > public/app.js
cp order-catalog-v22/service-worker-reset.js public/service-worker.js

# Seller/admin V2.11 (filename kept for compatibility)
cp order-catalog-v22/admin-v24.html public/admin-v24.html
cp order-catalog-v22/admin-v24.js public/admin-v24.js
cp order-catalog-v22/admin-v29.js public/admin-v29.js
cp order-catalog-v22/admin-v30.js public/admin-v30.js
cp order-catalog-v22/admin-v31-bulk-images.js public/admin-v31-bulk-images.js
python3 - <<'PY'
p='public/admin-v24.html'
s=open(p,encoding='utf-8').read()
s=s.replace('</body>','<script src="admin-v29.js"></script><script src="admin-v30.js"></script><script src="admin-v31-bulk-images.js"></script></body>')
open(p,'w',encoding='utf-8').write(s)
PY

# Keep current catalog snapshot available as a static fallback/debug file.
curl -fL -sS https://order-catalog-api-v22.onrender.com/api/products -o public/catalog.json

# Reuse established base stylesheet, then append buyer-specific styles.
curl -fL -sS https://order-catalog-v22-fixed.onrender.com/styles.css -o public/styles.css
cat order-catalog-v22/buyer-v26.css >> public/styles.css
cat order-catalog-v22/buyer-v27.css >> public/styles.css
cat order-catalog-v22/buyer-v28.css >> public/styles.css

# Show the current storefront version and force browsers to fetch V2.13 assets.
python3 - <<'PY'
p='public/index.html'
s=open(p,encoding='utf-8').read()
s=s.replace('<title>สั่งสินค้า V2.6</title>','<title>สั่งสินค้า V2.13</title>')
s=s.replace('href="styles.css"','href="styles.css?v=213"')
s=s.replace('src="app.js"','src="app.js?v=213"')
s=s.replace("navigator.serviceWorker.register('/service-worker.js'","navigator.serviceWorker.register('/service-worker.js?v=213'")
open(p,'w',encoding='utf-8').write(s)
PY

# Keep original product images available locally. Admin-uploaded images are served by the API URL stored on each product.
for i in $(seq -w 1 295); do
  curl -fL -sS "https://order-catalog-v22-fixed.onrender.com/products/p${i}.jpg" -o "public/products/p${i}.jpg"
done

test -s public/products/p001.jpg
test -s public/products/p050.jpg
test -s public/products/p150.jpg
test -s public/products/p295.jpg
file public/products/p001.jpg public/products/p050.jpg public/products/p150.jpg public/products/p295.jpg

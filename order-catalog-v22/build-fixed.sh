#!/usr/bin/env bash
set -euo pipefail
rm -rf public
mkdir -p public/products

# Buyer storefront V2.6
cp order-catalog-v22/buyer-v26.html public/index.html
cp order-catalog-v22/buyer-v26.js public/app.js
cp order-catalog-v22/service-worker-reset.js public/service-worker.js

# Seller/admin V2.5 (filename kept for compatibility)
cp order-catalog-v22/admin-v24.html public/admin-v24.html
cp order-catalog-v22/admin-v24.js public/admin-v24.js

# Keep current catalog snapshot available as a static fallback/debug file.
curl -fL -sS https://order-catalog-api-v22.onrender.com/api/products -o public/catalog.json

# Reuse the established base stylesheet, then append V2.6 buyer styles.
curl -fL -sS https://order-catalog-v22-fixed.onrender.com/styles.css -o public/styles.css
cat order-catalog-v22/buyer-v26.css >> public/styles.css

# Keep original product images available locally. Admin-uploaded images are served by the API URL stored on each product.
for i in $(seq -w 1 295); do
  curl -fL -sS "https://order-catalog-v22-fixed.onrender.com/products/p${i}.jpg" -o "public/products/p${i}.jpg"
done

test -s public/products/p001.jpg
test -s public/products/p050.jpg
test -s public/products/p150.jpg
test -s public/products/p295.jpg
file public/products/p001.jpg public/products/p050.jpg public/products/p150.jpg public/products/p295.jpg

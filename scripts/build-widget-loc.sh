version=v1.0

npm run widget:loc
mkdir -p ./build/widget/$version-chunks
cp ./widget/static/js/main.*.js ./build/widget/$version
cp ./widget/static/css/main.*.css ./build/widget/$version.css
cp ./widget/static/js/*.chunk.js ./build/widget/$version-chunks || true
cp ./widget/static/css/*.chunk.css ./build/widget/$version-chunks || true
cp ./widget/*.wasm ./build/widget/$version-chunks || true

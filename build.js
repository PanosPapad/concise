const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

const watch = process.argv.includes("--watch");
const distDir = path.resolve(__dirname, "dist");

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

async function build() {
  // Copy static assets
  copyFile(
    path.resolve(__dirname, "manifest.json"),
    path.resolve(distDir, "manifest.json")
  );
  copyFile(
    path.resolve(__dirname, "src/popup/index.html"),
    path.resolve(distDir, "popup/index.html")
  );

  // Popup bundle
  const popupOptions = {
    entryPoints: ["src/popup/index.tsx"],
    bundle: true,
    format: "iife",
    outfile: "dist/popup/index.js",
    jsx: "automatic",
    jsxImportSource: "preact",
  };

  // Service worker bundle
  const swOptions = {
    entryPoints: ["src/background/service-worker.ts"],
    bundle: true,
    format: "iife",
    outfile: "dist/background/service-worker.js",
  };

  if (watch) {
    const popupCtx = await esbuild.context(popupOptions);
    const swCtx = await esbuild.context(swOptions);
    await Promise.all([popupCtx.watch(), swCtx.watch()]);
    console.log("Watching for changes...");
  } else {
    await Promise.all([esbuild.build(popupOptions), esbuild.build(swOptions)]);
    console.log("Build complete.");
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});

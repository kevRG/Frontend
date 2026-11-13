import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const ROOT = import.meta.dirname;
const PARTIALS_DIR = resolve(ROOT, "src/partials");

const INCLUDE_RE = /<include\s+([^>]*?)\s*(?:\/>|>\s*<\/include>)/g;
const ATTR_RE = /([\w-]+)\s*=\s*"([^"]*)"/g;
const VAR_RE = /\{\{\s*([\w-]+)\s*\}\}/g;

function renderPartials(html, depth = 0) {
  if (depth > 10)
    throw new Error("[html-partials] Demasiados niveles de partials anidados.");

  return html.replace(INCLUDE_RE, (tag, attrs) => {
    const data = Object.fromEntries(
      [...attrs.matchAll(ATTR_RE)].map(([, key, value]) => [key, value]),
    );
    if (!data.src)
      throw new Error(`[html-partials] Falta el atributo src en: ${tag}`);

    const content = readFileSync(
      resolve(PARTIALS_DIR, data.src),
      "utf8",
    ).replace(VAR_RE, (_, key) => data[key] ?? "");
    return renderPartials(content, depth + 1);
  });
}

function htmlPartials() {
  return {
    name: "html-partials",
    transformIndexHtml: {
      order: "pre",
      handler: (html) => renderPartials(html),
    },
    configureServer(server) {
      server.watcher.add(PARTIALS_DIR);
      server.watcher.on("change", (file) => {
        if (file.startsWith(PARTIALS_DIR))
          server.ws.send({ type: "full-reload" });
      });
    },
  };
}

export default defineConfig({
  plugins: [htmlPartials()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(ROOT, "index.html"),
        login: resolve(ROOT, "login.html"),
        home: resolve(ROOT, "home.html"),
      },
    },
  },
});

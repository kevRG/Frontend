import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const ROOT = import.meta.dirname;
const PARTIALS_DIR = resolve(ROOT, "src/partials");

/* Todas las páginas .html de la raíz entran al build (así ninguna da 404 en producción). */
const PAGINAS = Object.fromEntries(
  readdirSync(ROOT)
    .filter((archivo) => archivo.endsWith(".html"))
    .map((archivo) => [archivo.replace(/\.html$/, ""), resolve(ROOT, archivo)]),
);

/* Expresiones sin cuantificadores ambiguos para evitar backtracking. */
const INCLUDE_RE = /<include\s([^>]*)>(?:\s*<\/include>)?/g;
const ATTR_RE = /([\w-]+)="([^"]*)"/g;
const VAR_RE = /\{\{([\w-]+)\}\}/g;

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
  /* Sitio multipágina: una ruta inexistente da 404 en vez de mostrar la portada. */
  appType: "mpa",
  build: {
    rollupOptions: {
      input: PAGINAS,
    },
  },
});

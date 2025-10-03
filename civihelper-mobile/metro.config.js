// civihelper-mobile/metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;

// Ruta ABSOLUTA (Windows) a tu backend.
// Si mueves la carpeta, actualiza esta ruta.
const backendAbs = "C:\\Users\\j34mi\\Desktop\\Proyecto\\civihelper-backend";

const config = getDefaultConfig(projectRoot);

// Bloquea el backend por nombre de carpeta (fallback genérico)
const genericBackendBlock = /[\\\/]civihelper-backend[\\\/].*/;

// Bloquea la ruta ABSOLUTA del backend (Windows)
const backendAbsRegex = new RegExp(
  backendAbs.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&") + "[\\\\/].*"
);

// (opcional) carpeta uploads local
const uploadsRegex = /[\\\/]uploads[\\\/].*/;

// ✅ Crea un único RegExp uniendo los patrones
const blockListRE = new RegExp(
  [genericBackendBlock, backendAbsRegex, uploadsRegex]
    .map((r) => r.source)
    .join("|")
);

// Aplica el blockList y restringe node_modules
config.resolver = {
  ...config.resolver,
  blockList: blockListRE,
  nodeModulesPaths: [path.join(projectRoot, "node_modules")],
};

// Evita que Metro vigile carpetas fuera del móvil
config.watchFolders = [projectRoot];

module.exports = config;

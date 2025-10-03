// src/components/SmartImage.js
import React from "react";
import { Image } from "react-native";
import { ENV } from "../config/env";

/**
 * Si te llega una key (ej: "uploads/abc.jpg") la convierte a URL pública.
 * Si ya es http(s), la respeta.
 */
function toUrl(src) {
  if (!src) return null;
  if (/^https?:\/\//i.test(src)) return src;
  if (ENV.CDN_BASE_URL) return `${ENV.CDN_BASE_URL}/${src}`.replace(/\/+/g, "/").replace(":/", "://");
  // fallback: tu API podría tener /files/:key
  return `${ENV.API_URL.replace(/\/+api\/?$/, "")}/${src}`.replace(/\/+/g, "/").replace(":/", "://");
}

export default function SmartImage({ source, style, ...rest }) {
  const uri = toUrl(source);
  if (!uri) return null;
  return <Image source={{ uri }} style={style} {...rest} />;
}

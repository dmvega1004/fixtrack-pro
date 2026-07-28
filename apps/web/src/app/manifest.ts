import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FixTrack Pro",
    short_name: "FixTrack",
    display: "standalone",
    theme_color: "#2563EB",
    background_color: "#FAFAFA",
    start_url: "/",
    icons: [
      {
        src: "/brand/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/brand/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}

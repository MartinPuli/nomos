import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["react-markdown", "remark-gfm", "remark-parse", "unified", "bail", "devlop", "extend", "is-plain-obj", "mdast-util-from-markdown", "mdast-util-gfm", "mdast-util-to-hast", "micromark", "micromark-extension-gfm", "property-information", "space-separated-tokens", "comma-separated-tokens", "decode-named-character-reference", "ccount", "character-entities", "character-entities-legacy", "character-reference-invalid", "hast-util-to-jsx-runtime", "hast-util-whitespace", "vfile", "vfile-message"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;

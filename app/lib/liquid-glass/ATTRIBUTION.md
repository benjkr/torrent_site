# Liquid Glass — attribution

Refraction math, displacement-map generation, specular maps, and SVG filter
composition adapted from [kube](https://github.com/kube)’s article and source:

- Article: https://kube.io/blog/liquid-glass-css-svg/
- Source: https://github.com/kube/kube.io/tree/main/app/data/articles/2025_10_04_liquid_glass_css_svg

Adapted for this app: browser `ImageData` (no native `canvas`), runtime filters
(no Vite virtual module), SSR-safe client mount, and Chromium fallback blur.

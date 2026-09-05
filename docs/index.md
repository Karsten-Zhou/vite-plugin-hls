---
layout: home

hero:
  name: vite-plugin-hls
  text: HLS for your videos, at build time.
  tagline: Import a video, get back an HLS playlist URL — transcoded during Vite build with node-av.
  actions:
    - theme: brand
      text: Quick Start
      link: /quick-start
    - theme: alt
      text: Live Demo
      link: /demo

features:
  - title: Single mode
    details: Remux a source into HLS without re-encoding.
  - title: Adaptive mode
    details: Encode multiple resolution/bitrate renditions and a master playlist.
  - title: Persistent cache
    details: Reuse encoded output across client/SSR and repeated builds.
---

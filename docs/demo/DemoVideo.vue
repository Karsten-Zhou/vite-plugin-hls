<script setup>
import hlsUrl from "../demo.mp4";
</script>

<template>
  <video :src="hlsUrl" controls muted style="max-width: 100%" />
</template>

<template>
  <div class="main-header">
    <h1>{{ title }}</h1>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: 'AccentShadow'
  }
})
</script>

<style scoped>
.main-header {
  text-align: center;
  margin-bottom: 24px;
}

.main-header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(45deg, #00d2ff, #3a7bd5);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: none;
  margin: 0;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .main-header h1 {
    font-size: 2rem;
  }
}
</style>
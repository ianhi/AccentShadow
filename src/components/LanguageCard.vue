<template>
  <component
    :is="disabled ? 'div' : 'button'"
    class="language-card"
    :class="{ 
      'disabled': disabled, 
      'loading': loading,
      'active': active 
    }"
    :disabled="disabled || loading"
    @click="!disabled && $emit('click')"
  >
    <div v-if="loading" class="loading-overlay"></div>
    <div class="card-icon">{{ flag }}</div>
    <h4 class="card-title">{{ name }}</h4>
    <p class="card-description">
      <template v-if="(demoCount ?? 0) > 0">
        {{ demoCount }} demo{{ (demoCount ?? 0) > 1 ? 's' : '' }} available
      </template>
      <template v-else>
        Coming soon
      </template>
    </p>
  </component>
</template>

<script setup lang="ts">
interface Props {
  name: string
  flag: string
  demoCount?: number
  disabled?: boolean
  loading?: boolean
  active?: boolean
}

withDefaults(defineProps<Props>(), {
  demoCount: 0,
  disabled: false,
  loading: false,
  active: false
})
defineEmits<{
  click: []
}>()
</script>

<style scoped>
.language-card {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
  width: 100%;
  display: block;
}

.language-card:not(.disabled):hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(96, 165, 250, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.language-card.active {
  background: rgba(96, 165, 250, 0.2);
  border-color: #60a5fa;
}

.language-card.loading {
  background: rgba(96, 165, 250, 0.2);
  border-color: #60a5fa;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(96, 165, 250, 0.3), transparent);
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  100% {
    left: 100%;
  }
}

.language-card.disabled {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
  cursor: not-allowed;
  opacity: 0.6;
}

.card-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.card-title {
  color: white;
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.card-description {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  margin: 0;
}

.language-card.disabled .card-description {
  color: rgba(255, 255, 255, 0.5);
}

/* Mobile responsive */
@media (max-width: 768px) {
  .card-icon {
    font-size: 36px;
  }
}
</style>
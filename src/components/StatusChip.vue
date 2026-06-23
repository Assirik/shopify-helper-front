<script setup lang="ts">
import { computed } from 'vue'
import { lookupMeta, type StatusMeta } from '@/constants/status'

const props = withDefaults(
  defineProps<{
    table: Record<string, StatusMeta>
    value: string | null | undefined
    size?: string
    showIcon?: boolean
  }>(),
  { size: 'small', showIcon: true },
)

const meta = computed(() => lookupMeta(props.table, props.value))
</script>

<template>
  <v-chip
    :color="meta.color"
    :size="size"
    variant="tonal"
    :border="`${meta.color} sm opacity-50`"
  >
    <v-icon v-if="showIcon && meta.icon" :icon="meta.icon" start size="14" />
    {{ meta.label }}
  </v-chip>
</template>

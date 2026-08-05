<script setup lang="ts">
const title = 'Personal Finances App'
const subtitle = 'Hello World!'
</script>

<template>
  <v-app>
    <v-app-bar color="primary" elevation="2">
      <v-app-bar-title>Personal Finances App</v-app-bar-title>
    </v-app-bar>
    <v-main class="d-flex align-center justify-center">
      <v-card width="480" class="pa-8 text-center" color="surface">
        <v-icon icon="mdi-wallet" size="64" color="primary" class="mb-4" />
        <v-card-title class="text-h4 font-weight-bold">{{ title }}</v-card-title>
        <v-card-subtitle class="text-h6 mt-2">{{ subtitle }}</v-card-subtitle>
      </v-card>
    </v-main>
  </v-app>
</template>

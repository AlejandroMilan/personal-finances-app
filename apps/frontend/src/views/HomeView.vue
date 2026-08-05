<script setup lang="ts">
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
</script>

<template>
  <v-container class="fill-height d-flex align-center justify-center">
    <v-card width="480" class="pa-8 text-center" color="surface">
      <v-icon icon="mdi-wallet" size="64" color="primary" class="mb-4" />
      <v-card-title class="text-h4 font-weight-bold">Hello World!</v-card-title>
      <v-card-subtitle class="text-h6 mt-2">
        Welcome, {{ auth.user?.fullName }}
      </v-card-subtitle>
    </v-card>
  </v-container>
</template>

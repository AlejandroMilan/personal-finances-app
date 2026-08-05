<script setup lang="ts">
import { useAuthStore } from './stores/auth';

const auth = useAuthStore();
</script>

<template>
  <v-app>
    <v-app-bar color="primary" elevation="2">
      <v-app-bar-title>Personal Finances App</v-app-bar-title>
      <template v-if="auth.isAuthenticated">
        <v-btn to="/home" prepend-icon="mdi-home" variant="text">Home</v-btn>
        <v-btn to="/accounts" prepend-icon="mdi-wallet" variant="text">Accounts</v-btn>
      </template>
    </v-app-bar>
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

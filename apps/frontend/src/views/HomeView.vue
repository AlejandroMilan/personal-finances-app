<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();

function logout(): void {
  auth.logout();
  void router.push({ name: 'login' });
}
</script>

<template>
  <v-container class="fill-height d-flex align-center justify-center">
    <v-card width="480" class="pa-8 text-center" color="surface">
      <v-icon icon="mdi-wallet" size="64" color="primary" class="mb-4" />
      <v-card-title class="text-h4 font-weight-bold">Hello World!</v-card-title>
      <v-card-subtitle class="text-h6 mt-2">
        Welcome, {{ auth.user?.fullName }}
      </v-card-subtitle>
      <v-btn color="primary" variant="outlined" class="mt-6" @click="logout">
        Log out
      </v-btn>
    </v-card>
  </v-container>
</template>

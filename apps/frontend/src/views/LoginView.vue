<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const form = ref<{ validate: () => Promise<string[]> } | null>(null);
const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');
const registered = route.query.registered === '1';

const emailRules = [
  (value: string) => !!value || 'Email is required',
  (value: string) => /.+@.+\..+/.test(value) || 'Enter a valid email',
];
const passwordRules = [(value: string) => !!value || 'Password is required'];

async function submit(): Promise<void> {
  const errors = form.value ? await form.value.validate() : [];
  if (errors.length > 0) return;

  loading.value = true;
  error.value = '';
  try {
    await auth.login(email.value, password.value);
    await router.push({ name: 'home' });
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Login failed';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <v-container class="fill-height d-flex align-center justify-center">
    <v-card width="420" class="pa-8" color="surface">
      <v-card-title class="text-h4 text-center font-weight-bold mb-2">
        Welcome back
      </v-card-title>
      <v-card-subtitle class="text-center mb-4">
        Sign in to manage your finances
      </v-card-subtitle>

      <v-alert v-if="registered" type="success" class="mb-4">
        Account created. Sign in to continue.
      </v-alert>
      <v-alert v-if="error" type="error" class="mb-4">
        {{ error }}
      </v-alert>

      <v-form ref="form" @submit.prevent="submit">
        <v-text-field
          v-model="email"
          label="Email"
          type="email"
          prepend-icon="mdi-email"
          :rules="emailRules"
        />
        <v-text-field
          v-model="password"
          label="Password"
          type="password"
          prepend-icon="mdi-lock"
          :rules="passwordRules"
        />
        <v-btn type="submit" color="primary" block class="mt-4" :loading="loading">
          Sign in
        </v-btn>
      </v-form>

      <p class="text-center mt-4 mb-0">
        No account?
        <router-link to="/register" class="text-primary">Create one</router-link>
      </p>
    </v-card>
  </v-container>
</template>

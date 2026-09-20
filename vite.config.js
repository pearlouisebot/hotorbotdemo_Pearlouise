import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    base: '/hotorbotdemo_Pearlouise/',
    plugins: [react()],
    server: {
        host: true,
    },
    build: {
        target: 'es2020',
    },
});

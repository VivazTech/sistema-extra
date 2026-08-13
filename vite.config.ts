import os from 'os';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // Cache fora do OneDrive: evita EPERM ao reotimizar deps no Windows
      cacheDir: path.join(os.tmpdir(), 'vivaz-controle-extra-vite'),
      server: {
        // 3000 está ocupado pelo outro projeto (Real Foz / Next.js) em IPv6.
        // localhost no Windows resolve ::1 primeiro e abria o app errado.
        port: 5173,
        strictPort: true,
        host: '0.0.0.0',
        preTransformRequests: false,
        warmup: {
          clientFiles: [
            './index.tsx',
            './App.tsx',
            './context/AuthContext.tsx',
            './context/ExtraContext.tsx',
            './pages/Login.tsx',
            './components/Layout.tsx',
            './components/LoadingLottie.tsx',
            './services/supabase.ts',
          ],
        },
        watch: {
          usePolling: true,
          interval: 1000,
        },
      },
      optimizeDeps: {
        holdUntilCrawlEnd: false,
        noDiscovery: true,
        include: [
          'react',
          'react-dom',
          'react-dom/client',
          'react/jsx-runtime',
          'react/jsx-dev-runtime',
          'react-router-dom',
          '@supabase/supabase-js',
          'lucide-react',
          'lottie-react',
          'recharts',
          'jspdf',
          'jspdf-autotable',
          'xlsx',
        ],
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});

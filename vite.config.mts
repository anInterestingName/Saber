import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import createVitePlugins from './vite/plugins';
import type { ConfigEnv, UserConfig } from 'vite';
// https://vitejs.dev/config/
export default ({ mode, command }: ConfigEnv): UserConfig => {
  const env = loadEnv(mode, process.cwd());
  const { VITE_APP_BASE, VITE_APP_PORT, VITE_APP_PROXY_TARGET } = env;

  // 开发服务器：端口与代理目标由环境变量驱动，未配置时回退既有默认值
  const serverConfig: UserConfig['server'] = {
    port: Number(VITE_APP_PORT) || 2888,
    proxy: {
      '/api': {
        target: VITE_APP_PROXY_TARGET || 'http://localhost',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, ''),
      },
    },
  };

  return defineConfig({
    base: VITE_APP_BASE,
    server: serverConfig,
    resolve: {
      alias: {
        '~': resolve(__dirname, './'),
        '@': resolve(__dirname, './src'),
        components: resolve(__dirname, './src/components'),
        styles: resolve(__dirname, './src/styles'),
        utils: resolve(__dirname, './src/utils'),
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
        },
      },
    },
    plugins: createVitePlugins(env, command === 'build'),
  });
};

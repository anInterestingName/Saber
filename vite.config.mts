import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import createVitePlugins from './vite/plugins';
import type { ConfigEnv, UserConfig } from 'vite';
// https://vitejs.dev/config/
export default ({ mode, command }: ConfigEnv): UserConfig => {
  const env = loadEnv(mode, process.cwd());
  const { VITE_APP_BASE, VITE_APP_PORT, VITE_APP_PROXY_TARGET } = env;
  const authTarget = env.VITE_AUTH_PROXY_TARGET || 'http://127.0.0.1:8100';
  const bffTarget = env.VITE_BFF_PROXY_TARGET || VITE_APP_PROXY_TARGET || 'http://localhost';

  // 开发服务器：端口与代理目标由环境变量驱动，未配置时回退既有默认值
  const serverConfig: UserConfig['server'] = {
    port: Number(VITE_APP_PORT) || 2888,
    strictPort: true,
    proxy: {
      '^/auth-api/(?:ui/login-context|ui/consent|login|oauth2/authorize)(?:\\?|$)': {
        target: authTarget,
        changeOrigin: true,
        xfwd: true,
        rewrite: path => path.replace(/^\/auth-api/, ''),
        bypass: req => {
          const path = req.url?.split('?')[0];
          const methods = {
            '/auth-api/ui/login-context': 'GET',
            '/auth-api/ui/consent': 'GET',
            '/auth-api/login': 'POST',
            '/auth-api/oauth2/authorize': 'POST',
          };
          return methods[path] === req.method ? undefined : false;
        },
      },
      '^/oauth2/authorization/blade(?:\\?|$)': {
        target: bffTarget,
        changeOrigin: true,
        xfwd: true,
      },
      '^/login/oauth2/code/blade(?:\\?|$)': { target: bffTarget, changeOrigin: true, xfwd: true },
      '/bff/': { target: bffTarget, changeOrigin: true, xfwd: true },
      '^/(?:oauth2/(?:authorize|token|jwks|revoke|introspect)|userinfo|\\.well-known/(?:openid-configuration|oauth-authorization-server)|login)(?:\\?|$)':
        {
          target: authTarget,
          changeOrigin: true,
          xfwd: true,
        },
      '^/(?:auth-api|oauth2|login/oauth2/code|blade-auth)(?:/|$)': {
        target: authTarget,
        bypass: () => false,
      },
      '/api/': {
        target: bffTarget,
        changeOrigin: true,
        xfwd: true,
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

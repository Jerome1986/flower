import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import { resolve } from 'path'
import Components from '@uni-helper/vite-plugin-uni-components';
import { WotResolver } from './wot-ui-resolver';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    // 开发阶段启用源码映射：https://uniapp.dcloud.net.cn/tutorial/migration-to-vue3.html#需主动开启-sourcemap
    sourcemap: process.env.NODE_ENV === 'development',
  },
  plugins: [
    Components(
      {
        resolvers: [
          WotResolver(),
        ]
      }
    ),
    uni()
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/style/base.scss" as *;`,
        silenceDeprecations: ['legacy-js-api'],
      },
    },
  },
})

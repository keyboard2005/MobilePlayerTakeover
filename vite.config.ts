import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
    plugins: [
        monkey({
            entry: 'src/main.ts', // 你的主入口文件
            userscript: {
                name: 'TanzerScript',
                match: ['https://example.com/*'],
            },
            server: {
                open: true, // 是否自动打开浏览器
            }
        })
    ]
});
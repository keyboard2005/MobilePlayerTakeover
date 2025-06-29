import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
    plugins: [
        monkey({
            entry: 'src/main.ts', // 你的主入口文件
            userscript: {
                name: 'Mobile Player Takeover - 移动播放器手势控制',
                description: '为网页播放器添加手势控制功能，支持双击暂停/播放等操作',
                version: '1.0.0',
                author: 'Your Name',
                match: ['*://*/*'],
                'run-at': 'document-start'
            },
            server: {
                open: true, // 是否自动打开浏览器
            }
        })
    ]
});
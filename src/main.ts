import { initAllVideos, setVideoMask } from './utils/playerDetector'

// 创建按钮（你的代码不变）
document.addEventListener('DOMContentLoaded', () => {
    // 初始化已有视频
    initAllVideos();

    // 监听后续动态添加的视频元素
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                // 1. 直接是 video
                if (node instanceof HTMLVideoElement) {
                    setVideoMask(node);
                }
                // 2. 容器里有 video
                if (node instanceof HTMLElement) {
                    node.querySelectorAll('video').forEach(v => setVideoMask(v));
                }
            });
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});
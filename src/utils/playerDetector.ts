// src/utils/playerDetector.ts

/**
 * 获取页面上所有可访问的 video 元素
 */
export function initAllVideos(): void {
    const result: HTMLVideoElement[] = [];
    document.querySelectorAll('video').forEach(v => result.push(v));
    result.forEach(video => {
        if (video.getAttribute('takeoverVideo') === 'true') return;
        video.setAttribute('takeoverVideo', 'true');
        setVideoMask(video);
    });
}

/**
 * 为视频元素添加灰色半透明遮罩，支持双击播放/暂停、左右滑动快退快进，拖拽时实时显示快进/快退秒数，松手立刻隐藏提示
 * 并在右下角添加全屏按钮
 * @param video - 要添加遮罩的视频元素
 */
export function setVideoMask(video: HTMLVideoElement): void {
    // 确保父级是定位元素
    const parent = video.parentElement;
    if (!parent) return;
    if (getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative';
    }

    // 遮罩元素
    const mask = document.createElement('div');
    mask.style.position = 'absolute';
    mask.style.top = '0';
    mask.style.left = '0';
    mask.style.width = '100%';
    mask.style.height = '100%';
    mask.style.backgroundColor = 'rgba(128, 128, 128, 0)';
    mask.style.zIndex = '9999';
    mask.style.cursor = 'pointer';
    mask.style.touchAction = 'none'; // 禁止默认手势滚动
    parent.appendChild(mask);

    // 提示层
    const tip = document.createElement('div');
    tip.style.position = 'absolute';
    tip.style.top = '50%';
    tip.style.left = '50%';
    tip.style.transform = 'translate(-50%, -50%)';
    tip.style.background = 'rgba(40, 40, 40, 0.80)';
    tip.style.color = '#fff';
    tip.style.fontSize = '0.98rem';          // 字体变小
    tip.style.fontWeight = '500';
    tip.style.padding = '0.32em 1.05em';     // 更紧凑
    tip.style.borderRadius = '1em';          // 圆角更明显
    tip.style.boxShadow = '0 2px 12px 0 rgba(0,0,0,0.18)';
    tip.style.pointerEvents = 'none';
    tip.style.opacity = '0';
    tip.style.transition = 'opacity 0.2s cubic-bezier(.4,0,.2,1)';
    tip.style.zIndex = '10000';
    tip.style.userSelect = 'none';
    tip.style.letterSpacing = '0.02em';
    parent.appendChild(tip);

    // 全屏按钮
    const fullscreenBtn = document.createElement('div');
    fullscreenBtn.style.position = 'absolute';
    fullscreenBtn.style.bottom = '12px';
    fullscreenBtn.style.right = '12px';
    fullscreenBtn.style.width = '36px';
    fullscreenBtn.style.height = '36px';
    fullscreenBtn.style.backgroundColor = 'rgba(40, 40, 40, 0.80)';
    fullscreenBtn.style.borderRadius = '8px';
    fullscreenBtn.style.cursor = 'pointer';
    fullscreenBtn.style.display = 'flex';
    fullscreenBtn.style.alignItems = 'center';
    fullscreenBtn.style.justifyContent = 'center';
    fullscreenBtn.style.zIndex = '10001';
    fullscreenBtn.style.boxShadow = '0 2px 8px 0 rgba(0,0,0,0.15)';
    fullscreenBtn.style.transition = 'background-color 0.2s ease';
    fullscreenBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
        </svg>
    `;

    // 全屏按钮悬停效果
    fullscreenBtn.addEventListener('mouseenter', () => {
        fullscreenBtn.style.backgroundColor = 'rgba(60, 60, 60, 0.90)';
    });
    fullscreenBtn.addEventListener('mouseleave', () => {
        fullscreenBtn.style.backgroundColor = 'rgba(40, 40, 40, 0.80)';
    });

    // 假全屏状态管理
    let isFakeFullscreen = false;
    let originalStyles: any = {};
    let hiddenElements: HTMLElement[] = [];
    let fullscreenContainer: HTMLDivElement | null = null;

    function hideHighZIndexElements() {
        // 找到所有可能阻挡视频的高层级元素
        const allElements = document.querySelectorAll('*') as NodeListOf<HTMLElement>;
        hiddenElements = [];

        allElements.forEach(el => {
            if (el === video || el === fullscreenBtn || el.contains(video) || el.contains(fullscreenBtn) ||
                (fullscreenContainer && (el === fullscreenContainer || el.contains(fullscreenContainer)))) {
                return; // 跳过视频和按钮相关元素
            }

            const computedStyle = getComputedStyle(el);
            const zIndex = parseInt(computedStyle.zIndex);

            // 隐藏高层级元素、固定定位元素、粘性定位元素
            if ((zIndex > 500 && !isNaN(zIndex)) ||
                computedStyle.position === 'fixed' ||
                computedStyle.position === 'sticky' ||
                el.tagName === 'HEADER' ||
                el.tagName === 'NAV' ||
                el.classList.contains('header') ||
                el.classList.contains('navbar') ||
                el.classList.contains('nav') ||
                el.classList.contains('modal') ||
                el.classList.contains('popup') ||
                el.classList.contains('overlay')) {
                hiddenElements.push(el);
                el.style.display = 'none';
            }
        });
    }

    function restoreHiddenElements() {
        hiddenElements.forEach(el => {
            el.style.display = '';
        });
        hiddenElements = [];
    }

    // 手势控制函数，可以在普通模式和全屏模式下复用
    function addGestureControls(
        element: HTMLElement,
        targetVideo: HTMLVideoElement,
        tipShow: (msg: string) => void,
        tipHide: () => void
    ) {
        let lastTouchTime = 0;
        let startX = 0;
        let moved = false;
        let lastSeconds = 0;

        // 双击播放/暂停
        element.addEventListener('touchend', function (e) {
            e.preventDefault();
            e.stopPropagation();
            const now = Date.now();
            if (now - lastTouchTime < 250) {
                if (targetVideo.paused) {
                    targetVideo.play();
                    tipShow('播放');
                } else {
                    targetVideo.pause();
                    tipShow('暂停');
                }
                setTimeout(tipHide, 1000);
                lastTouchTime = 0;
            } else {
                lastTouchTime = now;
            }
        });

        // 手势滑动快进快退
        element.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                startX = e.touches[0].clientX;
                moved = false;
                lastSeconds = 0;
            }
        });

        element.addEventListener('touchmove', (e) => {
            moved = true;

            // 统一使用水平滑动：向右快进，向左快退
            const moveDistance = e.touches[0].clientX - startX;

            const threshold = 30;
            const secPer30px = 2;
            const seconds = Math.round((moveDistance / 30) * secPer30px);

            if (Math.abs(moveDistance) > threshold && seconds !== 0) {
                lastSeconds = seconds;
                if (seconds > 0) {
                    tipShow(`快进${seconds}秒`);
                } else {
                    tipShow(`快退${-seconds}秒`);
                }
            } else {
                lastSeconds = 0;
                tipHide();
            }
        });

        element.addEventListener('touchend', (_e) => {
            if (!moved) return;
            if (lastSeconds !== 0) {
                targetVideo.currentTime = Math.max(0, Math.min(targetVideo.duration, targetVideo.currentTime + lastSeconds));
                tipHide();
            } else {
                tipHide();
            }
        });
    }

    // 全屏按钮点击事件
    fullscreenBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isFakeFullscreen) {
            enterFakeFullscreen();
        } else {
            exitFakeFullscreen();
        }
    });

    function enterFakeFullscreen() {
        // 保存原始样式
        originalStyles = {
            position: video.style.position || getComputedStyle(video).position,
            top: video.style.top || getComputedStyle(video).top,
            left: video.style.left || getComputedStyle(video).left,
            width: video.style.width || getComputedStyle(video).width,
            height: video.style.height || getComputedStyle(video).height,
            zIndex: video.style.zIndex || getComputedStyle(video).zIndex,
            transform: video.style.transform || getComputedStyle(video).transform,
            parentPosition: parent?.style.position || '',
            parentOverflow: parent?.style.overflow || '',
            bodyOverflow: document.body.style.overflow,
            htmlOverflow: document.documentElement.style.overflow,
            bodyHeight: document.body.style.height,
            htmlHeight: document.documentElement.style.height
        };

        // 强制隐藏地址栏的方法
        function hideAddressBar() {
            // 方法1: 滚动到顶部隐藏地址栏
            window.scrollTo(0, 1);
            setTimeout(() => window.scrollTo(0, 0), 0);
            
            // 方法2: 设置viewport height为实际屏幕高度
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
            
            // 方法3: 强制页面高度
            document.body.style.height = '100vh';
            document.documentElement.style.height = '100vh';
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
            
            // 方法4: 尝试进入原生全屏（如果支持）
            try {
                if (document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen().catch(() => {});
                } else if ((document.documentElement as any).webkitRequestFullscreen) {
                    (document.documentElement as any).webkitRequestFullscreen().catch(() => {});
                } else if ((document.documentElement as any).mozRequestFullScreen) {
                    (document.documentElement as any).mozRequestFullScreen().catch(() => {});
                } else if ((document.documentElement as any).msRequestFullscreen) {
                    (document.documentElement as any).msRequestFullscreen().catch(() => {});
                }
            } catch (e) {
                // 忽略全屏API错误
            }
        }

        // 创建全屏容器
        fullscreenContainer = document.createElement('div');
        fullscreenContainer.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            max-height: 100vh !important;
            min-height: 100vh !important;
            z-index: 2147483647 !important;
            background: #000 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            outline: none !important;
            transform: none !important;
            animation: none !important;
            transition: none !important;
            pointer-events: auto !important;
            visibility: visible !important;
            opacity: 1 !important;
            display: block !important;
            overflow: hidden !important;
            isolation: isolate !important;
            will-change: transform !important;
            backface-visibility: hidden !important;
            perspective: 1000px !important;
            box-sizing: border-box !important;
        `;

        // 添加CSS来处理移动端浏览器地址栏
        const style = document.createElement('style');
        style.setAttribute('data-fullscreen-style', 'true');
        style.textContent = `
            /* 移动端浏览器地址栏隐藏 */
            @supports (-webkit-appearance: none) {
                body, html {
                    height: 100% !important;
                    overflow: hidden !important;
                }
            }
            
            /* iOS Safari 特殊处理 */
            @media screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) {
                body, html { height: 100vh !important; }
            }
            @media screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) {
                body, html { height: 100vh !important; }
            }
            @media screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) {
                body, html { height: 100vh !important; }
            }
            
            /* Android Chrome 特殊处理 */
            body {
                -webkit-transform: translate3d(0,0,0) !important;
                transform: translate3d(0,0,0) !important;
            }
            
            /* 强制全屏容器覆盖一切 */
            [data-fullscreen-container] {
                position: fixed !important;
                top: -10px !important;
                left: -10px !important;
                right: -10px !important;
                bottom: -10px !important;
                width: calc(100vw + 20px) !important;
                height: calc(100vh + 20px) !important;
                z-index: 2147483647 !important;
                background: #000 !important;
                padding: 10px !important;
                box-sizing: border-box !important;
            }
        `;
        document.head.appendChild(style);
        
        // 为容器添加特殊属性
        fullscreenContainer.setAttribute('data-fullscreen-container', 'true');

        // 设置视频样式为横屏全屏
        video.style.cssText = `
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vh !important;
            height: 100vw !important;
            z-index: 2147483647 !important;
            transform: rotate(90deg) translate(0, -100%) !important;
            transform-origin: top left !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            outline: none !important;
            background: #000 !important;
            object-fit: contain !important;
            pointer-events: auto !important;
            visibility: visible !important;
            opacity: 1 !important;
            display: block !important;
        `;

        // 将视频移动到全屏容器中
        fullscreenContainer.appendChild(video);
        document.body.appendChild(fullscreenContainer);

        // 立即执行隐藏地址栏
        hideAddressBar();
        
        // 延时再次尝试隐藏地址栏
        setTimeout(hideAddressBar, 100);
        setTimeout(hideAddressBar, 300);
        setTimeout(hideAddressBar, 500);

        // 监听窗口大小变化，重新隐藏地址栏
        const handleResize = () => {
            hideAddressBar();
            // 重新调整容器大小
            if (fullscreenContainer) {
                fullscreenContainer.style.height = '100vh';
                fullscreenContainer.style.maxHeight = '100vh';
                fullscreenContainer.style.minHeight = '100vh';
            }
        };
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);
        
        // 清理函数，在退出全屏时移除监听器
        (fullscreenContainer as any)._cleanup = () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
        };

        // 隐藏页面上的所有高层级元素
        hideHighZIndexElements();

        // 创建新的全屏按钮
        const newFullscreenBtn = document.createElement('div');
        newFullscreenBtn.setAttribute('data-fullscreen-exit-btn', 'true'); // 添加标识
        newFullscreenBtn.style.cssText = `
            position: fixed !important;
            bottom: 12px !important;
            right: 12px !important;
            width: 36px !important;
            height: 36px !important;
            background-color: rgba(40, 40, 40, 0.80) !important;
            border-radius: 8px !important;
            cursor: pointer !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 2147483648 !important;
            box-shadow: 0 2px 8px 0 rgba(0,0,0,0.15) !important;
            transition: background-color 0.2s ease !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            outline: none !important;
            pointer-events: auto !important;
            visibility: visible !important;
            opacity: 1 !important;
            touch-action: manipulation !important;
        `;
        newFullscreenBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 0 2-2h3"/>
            </svg>
        `;

        // 添加退出全屏事件（使用多种事件类型确保响应）
        newFullscreenBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            exitFakeFullscreen();
        });

        newFullscreenBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            exitFakeFullscreen();
        });

        // 添加视觉反馈
        newFullscreenBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            newFullscreenBtn.style.backgroundColor = 'rgba(60, 60, 60, 0.90)';
        });

        newFullscreenBtn.addEventListener('touchcancel', () => {
            newFullscreenBtn.style.backgroundColor = 'rgba(40, 40, 40, 0.80)';
        });

        // 将按钮直接添加到 body，而不是容器内
        document.body.appendChild(newFullscreenBtn);

        // 创建全屏模式下的提示层
        const fullscreenTip = document.createElement('div');
        fullscreenTip.style.cssText = `
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            background: rgba(40, 40, 40, 0.80) !important;
            color: #fff !important;
            font-size: 0.98rem !important;
            font-weight: 500 !important;
            padding: 0.32em 1.05em !important;
            border-radius: 1em !important;
            box-shadow: 0 2px 12px 0 rgba(0,0,0,0.18) !important;
            pointer-events: none !important;
            opacity: 0 !important;
            transition: opacity 0.2s cubic-bezier(.4,0,.2,1) !important;
            z-index: 2147483647 !important;
            user-select: none !important;
            letter-spacing: 0.02em !important;
            margin: 0 !important;
            border: none !important;
            outline: none !important;
            visibility: visible !important;
            display: block !important;
        `;
        fullscreenContainer.appendChild(fullscreenTip);

        // 全屏模式的提示函数
        function fullscreenShowTip(message: string) {
            fullscreenTip.textContent = message;
            fullscreenTip.style.opacity = '1';
        }
        function fullscreenHideTip() {
            fullscreenTip.style.opacity = '0';
        }

        // 在全屏容器上添加手势操作
        addGestureControls(fullscreenContainer, video, fullscreenShowTip, fullscreenHideTip);

        // 防止页面滚动
        document.body.style.overflow = 'hidden';

        isFakeFullscreen = true;
        showTip('横屏全屏');
        setTimeout(hideTip, 1000);
    }

    function exitFakeFullscreen() {
        if (!fullscreenContainer || !parent) return;

        // 将视频移回原位置
        parent.appendChild(video);

        // 恢复视频原始样式
        video.style.position = originalStyles.position;
        video.style.top = originalStyles.top;
        video.style.left = originalStyles.left;
        video.style.width = originalStyles.width;
        video.style.height = originalStyles.height;
        video.style.zIndex = originalStyles.zIndex;
        video.style.transform = originalStyles.transform;
        video.style.transformOrigin = '';
        video.style.isolation = '';
        video.style.willChange = '';
        video.style.backfaceVisibility = '';
        video.style.perspective = '';
        video.style.margin = '';
        video.style.padding = '';
        video.style.border = '';
        video.style.outline = '';
        video.style.background = '';
        video.style.objectFit = '';
        video.style.pointerEvents = '';
        video.style.visibility = '';
        video.style.opacity = '';
        video.style.display = '';
        video.style.cssText = '';

        // 清理监听器
        if ((fullscreenContainer as any)._cleanup) {
            (fullscreenContainer as any)._cleanup();
        }

        // 移除全屏样式
        const fullscreenStyle = document.querySelector('[data-fullscreen-style="true"]');
        if (fullscreenStyle) {
            document.head.removeChild(fullscreenStyle);
        }

        // 退出原生全屏（如果之前进入了）
        try {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
            } else if ((document as any).webkitExitFullscreen) {
                (document as any).webkitExitFullscreen().catch(() => {});
            } else if ((document as any).mozCancelFullScreen) {
                (document as any).mozCancelFullScreen().catch(() => {});
            } else if ((document as any).msExitFullscreen) {
                (document as any).msExitFullscreen().catch(() => {});
            }
        } catch (e) {
            // 忽略全屏API错误
        }

        // 移除全屏容器
        document.body.removeChild(fullscreenContainer);
        fullscreenContainer = null;

        // 移除退出全屏按钮
        const exitBtn = document.querySelector('[data-fullscreen-exit-btn="true"]');
        if (exitBtn) {
            document.body.removeChild(exitBtn);
        }

        // 恢复被隐藏的元素
        restoreHiddenElements();

        // 恢复页面样式
        document.body.style.overflow = originalStyles.bodyOverflow;
        document.documentElement.style.overflow = originalStyles.htmlOverflow;
        document.body.style.height = originalStyles.bodyHeight;
        document.documentElement.style.height = originalStyles.htmlHeight;

        // 更新原按钮图标为进入全屏
        fullscreenBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            </svg>
        `;

        isFakeFullscreen = false;
        showTip('退出全屏');
        setTimeout(hideTip, 1000);
    }

    parent.appendChild(fullscreenBtn);

    function showTip(message: string) {
        tip.textContent = message;
        tip.style.opacity = '1';
    }
    function hideTip() {
        tip.style.opacity = '0';
    }

    // 为普通模式的遮罩添加手势控制
    addGestureControls(mask, video, showTip, hideTip);
}
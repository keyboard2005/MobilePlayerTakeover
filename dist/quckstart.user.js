// ==UserScript==
// @name         Mobile Player Takeover - 移动播放器手势控制
// @namespace    vite-plugin-monkey
// @version      1.0.0
// @author       Your Name
// @description  为网页播放器添加手势控制功能，支持双击暂停/播放等操作
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  function initAllVideos() {
    const result = [];
    document.querySelectorAll("video").forEach((v) => result.push(v));
    result.forEach((video) => {
      if (video.getAttribute("takeoverVideo") === "true") return;
      video.setAttribute("takeoverVideo", "true");
      setVideoMask(video);
    });
  }
  function setVideoMask(video) {
    const parent = video.parentElement;
    if (!parent) return;
    if (getComputedStyle(parent).position === "static") {
      parent.style.position = "relative";
    }
    const mask = document.createElement("div");
    mask.style.position = "absolute";
    mask.style.top = "0";
    mask.style.left = "0";
    mask.style.width = "100%";
    mask.style.height = "100%";
    mask.style.backgroundColor = "rgba(128, 128, 128, 0)";
    mask.style.zIndex = "9999";
    mask.style.cursor = "pointer";
    mask.style.touchAction = "none";
    parent.appendChild(mask);
    const tip = document.createElement("div");
    tip.style.position = "absolute";
    tip.style.top = "50%";
    tip.style.left = "50%";
    tip.style.transform = "translate(-50%, -50%)";
    tip.style.background = "rgba(40, 40, 40, 0.80)";
    tip.style.color = "#fff";
    tip.style.fontSize = "0.98rem";
    tip.style.fontWeight = "500";
    tip.style.padding = "0.32em 1.05em";
    tip.style.borderRadius = "1em";
    tip.style.boxShadow = "0 2px 12px 0 rgba(0,0,0,0.18)";
    tip.style.pointerEvents = "none";
    tip.style.opacity = "0";
    tip.style.transition = "opacity 0.2s cubic-bezier(.4,0,.2,1)";
    tip.style.zIndex = "10000";
    tip.style.userSelect = "none";
    tip.style.letterSpacing = "0.02em";
    parent.appendChild(tip);
    const fullscreenBtn = document.createElement("div");
    fullscreenBtn.style.position = "absolute";
    fullscreenBtn.style.bottom = "12px";
    fullscreenBtn.style.right = "12px";
    fullscreenBtn.style.width = "36px";
    fullscreenBtn.style.height = "36px";
    fullscreenBtn.style.backgroundColor = "rgba(40, 40, 40, 0.80)";
    fullscreenBtn.style.borderRadius = "8px";
    fullscreenBtn.style.cursor = "pointer";
    fullscreenBtn.style.display = "flex";
    fullscreenBtn.style.alignItems = "center";
    fullscreenBtn.style.justifyContent = "center";
    fullscreenBtn.style.zIndex = "10001";
    fullscreenBtn.style.boxShadow = "0 2px 8px 0 rgba(0,0,0,0.15)";
    fullscreenBtn.style.transition = "background-color 0.2s ease";
    fullscreenBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
        </svg>
    `;
    fullscreenBtn.addEventListener("mouseenter", () => {
      fullscreenBtn.style.backgroundColor = "rgba(60, 60, 60, 0.90)";
    });
    fullscreenBtn.addEventListener("mouseleave", () => {
      fullscreenBtn.style.backgroundColor = "rgba(40, 40, 40, 0.80)";
    });
    let isFakeFullscreen = false;
    let originalStyles = {};
    let hiddenElements = [];
    let fullscreenContainer = null;
    function hideHighZIndexElements() {
      const allElements = document.querySelectorAll("*");
      hiddenElements = [];
      allElements.forEach((el) => {
        if (el === video || el === fullscreenBtn || el.contains(video) || el.contains(fullscreenBtn) || fullscreenContainer && (el === fullscreenContainer || el.contains(fullscreenContainer))) {
          return;
        }
        const computedStyle = getComputedStyle(el);
        const zIndex = parseInt(computedStyle.zIndex);
        if (zIndex > 500 && !isNaN(zIndex) || computedStyle.position === "fixed" || computedStyle.position === "sticky" || el.tagName === "HEADER" || el.tagName === "NAV" || el.classList.contains("header") || el.classList.contains("navbar") || el.classList.contains("nav") || el.classList.contains("modal") || el.classList.contains("popup") || el.classList.contains("overlay")) {
          hiddenElements.push(el);
          el.style.display = "none";
        }
      });
    }
    function restoreHiddenElements() {
      hiddenElements.forEach((el) => {
        el.style.display = "";
      });
      hiddenElements = [];
    }
    function addGestureControls(element, targetVideo, tipShow, tipHide) {
      let lastTouchTime = 0;
      let startX = 0;
      let moved = false;
      let lastSeconds = 0;
      element.addEventListener("touchend", function(e) {
        e.preventDefault();
        e.stopPropagation();
        const now = Date.now();
        if (now - lastTouchTime < 250) {
          if (targetVideo.paused) {
            targetVideo.play();
            tipShow("播放");
          } else {
            targetVideo.pause();
            tipShow("暂停");
          }
          setTimeout(tipHide, 1e3);
          lastTouchTime = 0;
        } else {
          lastTouchTime = now;
        }
      });
      element.addEventListener("touchstart", (e) => {
        if (e.touches.length === 1) {
          startX = e.touches[0].clientX;
          moved = false;
          lastSeconds = 0;
        }
      });
      element.addEventListener("touchmove", (e) => {
        moved = true;
        const moveDistance = e.touches[0].clientX - startX;
        const threshold = 30;
        const secPer30px = 2;
        const seconds = Math.round(moveDistance / 30 * secPer30px);
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
      element.addEventListener("touchend", (_e) => {
        if (!moved) return;
        if (lastSeconds !== 0) {
          targetVideo.currentTime = Math.max(0, Math.min(targetVideo.duration, targetVideo.currentTime + lastSeconds));
          tipHide();
        } else {
          tipHide();
        }
      });
    }
    fullscreenBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isFakeFullscreen) {
        enterFakeFullscreen();
      } else {
        exitFakeFullscreen();
      }
    });
    function enterFakeFullscreen() {
      originalStyles = {
        position: video.style.position || getComputedStyle(video).position,
        top: video.style.top || getComputedStyle(video).top,
        left: video.style.left || getComputedStyle(video).left,
        width: video.style.width || getComputedStyle(video).width,
        height: video.style.height || getComputedStyle(video).height,
        zIndex: video.style.zIndex || getComputedStyle(video).zIndex,
        transform: video.style.transform || getComputedStyle(video).transform,
        parentPosition: (parent == null ? void 0 : parent.style.position) || "",
        parentOverflow: (parent == null ? void 0 : parent.style.overflow) || "",
        bodyOverflow: document.body.style.overflow,
        htmlOverflow: document.documentElement.style.overflow,
        bodyHeight: document.body.style.height,
        htmlHeight: document.documentElement.style.height
      };
      function hideAddressBar() {
        window.scrollTo(0, 1);
        setTimeout(() => window.scrollTo(0, 0), 0);
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty("--vh", `${vh}px`);
        document.body.style.height = "100vh";
        document.documentElement.style.height = "100vh";
        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";
        try {
          if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {
            });
          } else if (document.documentElement.webkitRequestFullscreen) {
            document.documentElement.webkitRequestFullscreen().catch(() => {
            });
          } else if (document.documentElement.mozRequestFullScreen) {
            document.documentElement.mozRequestFullScreen().catch(() => {
            });
          } else if (document.documentElement.msRequestFullscreen) {
            document.documentElement.msRequestFullscreen().catch(() => {
            });
          }
        } catch (e) {
        }
      }
      fullscreenContainer = document.createElement("div");
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
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            overflow: hidden !important;
            isolation: isolate !important;
            will-change: transform !important;
            backface-visibility: hidden !important;
            perspective: 1000px !important;
            box-sizing: border-box !important;
        `;
      const style = document.createElement("style");
      style.setAttribute("data-fullscreen-style", "true");
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
                padding: 0 !important;
                margin: 0 !important;
                box-sizing: border-box !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            }
        `;
      document.head.appendChild(style);
      fullscreenContainer.setAttribute("data-fullscreen-container", "true");
      video.style.cssText = `
            position: relative !important;
            width: 100vh !important;
            height: 100vw !important;
            max-width: 100vh !important;
            max-height: 100vw !important;
            z-index: 2147483647 !important;
            transform: rotate(90deg) !important;
            transform-origin: center center !important;
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
      fullscreenContainer.appendChild(video);
      document.body.appendChild(fullscreenContainer);
      hideAddressBar();
      setTimeout(hideAddressBar, 100);
      setTimeout(hideAddressBar, 300);
      setTimeout(hideAddressBar, 500);
      const handleResize = () => {
        hideAddressBar();
        if (fullscreenContainer) {
          fullscreenContainer.style.height = "100vh";
          fullscreenContainer.style.maxHeight = "100vh";
          fullscreenContainer.style.minHeight = "100vh";
        }
      };
      window.addEventListener("resize", handleResize);
      window.addEventListener("orientationchange", handleResize);
      fullscreenContainer._cleanup = () => {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("orientationchange", handleResize);
      };
      hideHighZIndexElements();
      const newFullscreenBtn = document.createElement("div");
      newFullscreenBtn.setAttribute("data-fullscreen-exit-btn", "true");
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
      newFullscreenBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        exitFakeFullscreen();
      });
      newFullscreenBtn.addEventListener("touchend", (e) => {
        e.preventDefault();
        e.stopPropagation();
        exitFakeFullscreen();
      });
      newFullscreenBtn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        e.stopPropagation();
        newFullscreenBtn.style.backgroundColor = "rgba(60, 60, 60, 0.90)";
      });
      newFullscreenBtn.addEventListener("touchcancel", () => {
        newFullscreenBtn.style.backgroundColor = "rgba(40, 40, 40, 0.80)";
      });
      document.body.appendChild(newFullscreenBtn);
      const fullscreenTip = document.createElement("div");
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
      function fullscreenShowTip(message) {
        fullscreenTip.textContent = message;
        fullscreenTip.style.opacity = "1";
      }
      function fullscreenHideTip() {
        fullscreenTip.style.opacity = "0";
      }
      addGestureControls(fullscreenContainer, video, fullscreenShowTip, fullscreenHideTip);
      document.body.style.overflow = "hidden";
      isFakeFullscreen = true;
      showTip("横屏全屏");
      setTimeout(hideTip, 1e3);
    }
    function exitFakeFullscreen() {
      if (!fullscreenContainer || !parent) return;
      parent.appendChild(video);
      video.style.position = originalStyles.position;
      video.style.top = originalStyles.top;
      video.style.left = originalStyles.left;
      video.style.width = originalStyles.width;
      video.style.height = originalStyles.height;
      video.style.zIndex = originalStyles.zIndex;
      video.style.transform = originalStyles.transform;
      video.style.transformOrigin = "";
      video.style.isolation = "";
      video.style.willChange = "";
      video.style.backfaceVisibility = "";
      video.style.perspective = "";
      video.style.margin = "";
      video.style.padding = "";
      video.style.border = "";
      video.style.outline = "";
      video.style.background = "";
      video.style.objectFit = "";
      video.style.pointerEvents = "";
      video.style.visibility = "";
      video.style.opacity = "";
      video.style.display = "";
      video.style.cssText = "";
      if (fullscreenContainer._cleanup) {
        fullscreenContainer._cleanup();
      }
      const fullscreenStyle = document.querySelector('[data-fullscreen-style="true"]');
      if (fullscreenStyle) {
        document.head.removeChild(fullscreenStyle);
      }
      try {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {
          });
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen().catch(() => {
          });
        } else if (document.mozCancelFullScreen) {
          document.mozCancelFullScreen().catch(() => {
          });
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen().catch(() => {
          });
        }
      } catch (e) {
      }
      document.body.removeChild(fullscreenContainer);
      fullscreenContainer = null;
      const exitBtn = document.querySelector('[data-fullscreen-exit-btn="true"]');
      if (exitBtn) {
        document.body.removeChild(exitBtn);
      }
      restoreHiddenElements();
      document.body.style.overflow = originalStyles.bodyOverflow;
      document.documentElement.style.overflow = originalStyles.htmlOverflow;
      document.body.style.height = originalStyles.bodyHeight;
      document.documentElement.style.height = originalStyles.htmlHeight;
      fullscreenBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            </svg>
        `;
      isFakeFullscreen = false;
      showTip("退出全屏");
      setTimeout(hideTip, 1e3);
    }
    parent.appendChild(fullscreenBtn);
    function showTip(message) {
      tip.textContent = message;
      tip.style.opacity = "1";
    }
    function hideTip() {
      tip.style.opacity = "0";
    }
    addGestureControls(mask, video, showTip, hideTip);
  }
  document.addEventListener("DOMContentLoaded", () => {
    initAllVideos();
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLVideoElement) {
            setVideoMask(node);
          }
          if (node instanceof HTMLElement) {
            node.querySelectorAll("video").forEach((v) => setVideoMask(v));
          }
        });
      });
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  });

})();
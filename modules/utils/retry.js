/**
 * retry.js — 带指数退避的 fetch 重试工具
 *
 * @param {string} url - 请求 URL
 * @param {object} options - fetch 选项（含 signal 用于 abort）
 * @param {number} maxRetries - 最大重试次数（默认 3）
 * @param {function} onRetry - 重试回调 (attempt, delay) => void
 * @returns {Promise<Response>}
 */
window.fetchWithRetry = function fetchWithRetry(url, options = {}, maxRetries = 3, onRetry) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    function attempt() {
      attempts++;
      fetch(url, options)
        .then(response => {
          // 5xx 时重试
          if (!response.ok && response.status >= 500 && attempts < maxRetries) {
            const delay = Math.pow(2, attempts - 1) * 1000;
            onRetry?.(attempts, delay);
            setTimeout(attempt, delay);
          } else {
            resolve(response);
          }
        })
        .catch(err => {
          // 网络错误时重试（排除 AbortError）
          if (err.name !== 'AbortError' && attempts < maxRetries) {
            const delay = Math.pow(2, attempts - 1) * 1000;
            onRetry?.(attempts, delay);
            setTimeout(attempt, delay);
          } else {
            reject(err);
          }
        });
    }
    attempt();
  });
};
/**
 * 美味创意AI厨房 - 后端代理函数
 * Vercel Serverless Function
 *
 * 作用：隐藏 API Key，代理前端请求
 * 主模型：LongCat-Flash-Chat（LongCat API）
 * 降级：OpenRouter 免费模型（stepfun/阶跃星辰）
 */

// ============ 模型配置 ============
// 第一梯队：LongCat（主），每日免费 50 万 tokens
const LONG_CAT_CONFIG = {
  apiKey: process.env.LONGCAT_API_KEY,
  endpoint: 'https://api.longcat.chat/openai/v1/chat/completions',
  model: 'LongCat-Flash-Lite',
  label: 'LongCat-Lite',
};

// 第二梯队：OpenRouter（降级备用）
const OPENROUTER_FALLBACKS = [
  { model: 'stepfun/step-3.5-flash:free', label: '阶跃星辰' },
  { model: 'arcee-ai/trinity-large-preview:free', label: 'Arcee Trinity' },
  { model: 'z-ai/glm-4.5-air:free', label: '智谱 GLM' },
  { model: 'nvidia/nemotron-3-super-120b-a12a:free', label: 'NVIDIA Nemotron' },
];

// ============ 通用配置 ============
const DEFAULT_TEMPERATURE = 0.9;
const DEFAULT_MAX_TOKENS = 1800;
const MAX_RETRIES = 3; // 429 重试次数

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'https://ai-kitchen.vercel.app',
  'https://www.bikini-bottom.store',
  'https://game.bikini-bottom.store',  // 当前主域名
];

export default async function handler(req, res) {
  // ========== CORS ==========
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ========== 输入验证 ==========
  const { messages, temperature, max_tokens, stream } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid messages format' });
  }
  if (messages.length === 0) {
    return res.status(400).json({ error: 'Messages cannot be empty' });
  }

  for (const msg of messages) {
    if (!msg.role || !msg.content) {
      return res.status(400).json({ error: 'Invalid message structure' });
    }
    if (msg.content.length > 5000) {
      return res.status(400).json({ error: 'Message content too long (max 5000 chars)' });
    }
  }

  const reqTemperature = temperature ?? DEFAULT_TEMPERATURE;
  const reqMaxTokens = max_tokens ?? DEFAULT_MAX_TOKENS;
  const reqStream = stream !== false;

  // ========== 第一梯队：LongCat API ==========
  if (LONG_CAT_CONFIG.apiKey) {
    const result = await callLongCat(req, res, {
      temperature: reqTemperature,
      max_tokens: reqMaxTokens,
      stream: reqStream,
    });

    if (result === 'success') return;
    if (result === 'fatal') return; // 非 429 错误，不尝试降级
    // result === 'retry' → 继续降级
  } else {
    console.warn('⚠️ LONGCAT_API_KEY not configured, skipping to fallback');
  }

  // ========== 第二梯队：OpenRouter 降级 ==========
  console.log('⬇️ Falling back to OpenRouter...');

  for (const { model, label } of OPENROUTER_FALLBACKS) {
    const result = await callOpenRouter(req, res, {
      model,
      label,
      temperature: reqTemperature,
      max_tokens: reqMaxTokens,
      stream: reqStream,
    });

    if (result === 'success') return;
    if (result === 'fatal') return;
    // result === 'retry' → 继续下一个模型
  }

  // 所有模型都失败了
  console.error('❌ All models failed');
  return res.status(500).json({ error: 'Service temporarily unavailable. Please try again later.' });
}

// ============ LongCat API 调用 ============
async function callLongCat(req, res, { temperature, max_tokens, stream }) {
  try {
    console.log('🔄 Trying: LongCat-Flash-Chat');

    const response = await fetchWithRetry(
      LONG_CAT_CONFIG.endpoint,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LONG_CAT_CONFIG.apiKey}`,
        },
        body: JSON.stringify({
          model: LONG_CAT_CONFIG.model,
          messages,
          temperature,
          max_tokens,
          stream,
        }),
      },
      res,
      stream
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`❌ LongCat failed:`, response.status, errorData);

      if (response.status === 429) {
        console.warn('⚠️ LongCat rate limited, trying fallback...');
        return 'retry';
      }
      return 'fatal';
    }

    console.log('✅ LongCat succeeded');
    return 'success';

  } catch (err) {
    console.error('❌ LongCat exception:', err.message);
    return 'retry'; // 网络错误，尝试降级
  }
}

// ============ OpenRouter API 调用 ============
async function callOpenRouter(req, res, { model, label, temperature, max_tokens, stream }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn(`⚠️ OPENROUTER_API_KEY not configured, skipping ${label}`);
    return 'retry';
  }

  try {
    console.log(`🔄 Trying: ${label} (${model})`);

    const response = await fetchWithRetry(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': req.headers.origin || 'https://game.bikini-bottom.store',
          'X-Title': 'AI Kitchen',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens,
          stream,
        }),
      },
      res,
      stream
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`❌ ${label} failed:`, response.status, errorData);

      if (response.status === 429) {
        console.warn(`⚠️ ${label} rate limited, trying next...`);
        return 'retry';
      }
      return 'fatal';
    }

    console.log(`✅ ${label} succeeded`);
    return 'success';

  } catch (err) {
    console.error(`❌ ${label} exception:`, err.message);
    return 'retry';
  }
}

// ============ 带重试的 fetch（处理 429 限流）============
async function fetchWithRetry(url, options, res, stream, retries = MAX_RETRIES) {
  let lastResponse = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      const waitTime = attempt * 2000; // 指数退避：2s, 4s, 6s
      console.log(`⏳ Waiting ${waitTime}ms before retry (attempt ${attempt}/${retries})...`);
      await sleep(waitTime);
    }

    const response = await fetch(url, options);
    lastResponse = response;

    if (response.ok) {
      return response;
    }

    if (response.status === 429) {
      const body = await response.json().catch(() => ({}));
      const retryAfter = body?.retry_after ?? 60;
      console.warn(`⚠️ Rate limited. retry_after=${retryAfter}s`);

      if (attempt < retries) {
        await sleep(Math.max(retryAfter * 1000, attempt * 2000));
        continue;
      }
    }

    // 非 200 或超过重试次数
    return response;
  }

  return lastResponse;
}

// ============ 流式响应处理 ============
function handleStreamResponse(response, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  (async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        res.write(chunk);
      }
      res.end();
    } catch (err) {
      console.error('❌ Stream error:', err);
      try {
        res.write(`data: {"error": "Stream interrupted"}\n\n`);
        res.end();
      } catch (_) {}
    }
  })();
}

// ============ 工具函数 ============
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

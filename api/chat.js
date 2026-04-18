/**
 * 美味创意AI厨房 - 后端代理函数
 * Vercel Serverless Function
 *
 * 作用：隐藏 API Key，代理前端请求到 AI 模型
 * 主模型：LongCat-Flash-Lite（5000万tokens/天）
 * 降级：OpenRouter 免费模型
 */

// 模型优先级列表（按顺序尝试）
const MODEL_FALLBACKS = [
  'LongCat-Flash-Lite',                    // 主模型：LongCat（优先使用）
  'stepfun/step-3.5-flash:free',           // 降级：阶跃星辰
  'arcee-ai/trinity-large-preview:free',   // 降级：Arcee Trinity
  'z-ai/glm-4.5-air:free',                 // 降级：智谱 GLM
  'nvidia/nemotron-3-super-120b-a12a:free', // 降级：NVIDIA Nemotron
];

// API 配置
const LONG_CAT_ENDPOINT = 'https://api.longcat.chat/openai/v1/chat/completions';
const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

export default async function handler(req, res) {
  // ========== 安全检查 ==========
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5000',
    'https://ai-kitchen.vercel.app',
    'https://www.bikini-bottom.store',
    'https://game.bikini-bottom.store',
  ];

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

  // ========== 调用 API（按优先级尝试）==========
  let lastError = null;

  for (const model of MODEL_FALLBACKS) {
    // 决定用哪个 API
    let endpoint, apiKey, headers;

    if (model === 'LongCat-Flash-Lite') {
      apiKey = process.env.LONGCAT_API_KEY;
      if (!apiKey) {
        console.log(`⏭️ LONGCAT_API_KEY not configured, skipping ${model}`);
        continue;
      }
      endpoint = LONG_CAT_ENDPOINT;
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      };
    } else {
      // OpenRouter 模型
      apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        console.log(`⏭️ OPENROUTER_API_KEY not configured, skipping ${model}`);
        continue;
      }
      endpoint = OPENROUTER_ENDPOINT;
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': origin || 'https://game.bikini-bottom.store',
        'X-Title': 'AI Kitchen',
      };
    }

    try {
      console.log(`🔄 Trying: ${model}`);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages,
          temperature: temperature || 0.9,
          max_tokens: max_tokens || 1800,
          stream: stream !== false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`❌ ${model} failed:`, response.status, errorData);

        // 429 限流 -> 尝试下一个模型
        if (response.status === 429) {
          console.warn(`⚠️ Rate limited, trying next...`);
          lastError = { status: 429, model };
          continue;
        }

        // 其他错误 -> 继续降级
        lastError = { status: response.status, data: errorData, model };
        continue;
      }

      console.log(`✅ ${model} succeeded`);

      // ========== 流式响应 ==========
      if (stream !== false) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

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
          res.write(`data: {"error": "Stream interrupted"}\n\n`);
          res.end();
        }
      } else {
        // ========== 非流式响应 ==========
        const data = await response.json();
        res.status(200).json(data);
      }

      return;

    } catch (err) {
      console.error(`❌ ${model} exception:`, err.message);
      lastError = { status: 500, error: err.message, model };
    }
  }

  // 所有模型都失败了
  console.error('❌ All models failed');
  res.status(lastError?.status || 500).json({
    error: lastError?.data?.error?.message || lastError?.error || 'All models failed',
  });
}

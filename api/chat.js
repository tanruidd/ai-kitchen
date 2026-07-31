/**
 * 美味创意AI厨房 - 后端代理函数
 * Vercel Serverless Function
 *
 * 作用：隐藏 API Key，代理前端请求到 OpenRouter 免费模型
 */

// 模型优先级列表（按顺序尝试，已实测可用）
const MODEL_FALLBACKS = [
  'google/gemma-4-26b-a4b-it:free',             // 降级1：Google Gemma（快速稳定）
  'nvidia/nemotron-3-ultra-550b-a55b:free',     // 降级2：NVIDIA Nemotron Ultra（1M上下文）
  'nvidia/nemotron-3-super-120b-a12b:free',     // 降级3：NVIDIA Nemotron Super
  'poolside/laguna-s-2.1:free',                 // 降级4：Poolside Laguna
  'openai/gpt-oss-20b:free',                    // 降级5：OpenAI OSS模型
  'openrouter/free',                            // 降级6：OpenRouter自动路由（兜底）
];

// API 配置
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
    let endpoint, apiKey, headers;

    // OpenRouter 模型
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.log(`⏭️ OPENROUTER_API_KEY not configured, skipping`);
      lastError = { status: 500, error: 'OPENROUTER_API_KEY not configured' };
      continue;
    }
    const endpoint = OPENROUTER_ENDPOINT;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': origin || 'https://game.bikini-bottom.store',
      'X-Title': 'AI Kitchen',
    };

    try {
      console.log(`🔄 Trying: ${model} | stream=${stream !== false}`);

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

      console.log(`📥 ${model} response status: ${response.status} | content-type: ${response.headers.get('content-type')}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`❌ ${model} failed:`, response.status, JSON.stringify(errorData));

        if (response.status === 429) {
          console.warn(`⚠️ Rate limited, trying next...`);
          lastError = { status: 429, model };
          continue;
        }

        lastError = { status: response.status, data: errorData, model };
        continue;
      }

      // ========== 流式响应 ==========
      if (stream !== false) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // OpenRouter 返回标准 SSE 格式，直接透传
        try {
          response.body.pipeThrough(new TextDecoderStream()).pipeTo(
            new WritableStream({
              write(chunk) {
                res.write(chunk);
              },
              close() {
                res.end();
              },
              abort(err) {
                console.error('❌ Stream error:', err);
                res.end();
              },
            })
          );
        } catch (err) {
          console.error('❌ Stream error:', err);
          res.write('data: {"error": "Stream interrupted"}\n\n');
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

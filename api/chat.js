/**
 * 美味创意AI厨房 - 后端代理函数
 * Vercel Serverless Function
 * 
 * 作用：隐藏 API Key，代理前端请求到 OpenRouter
 * 功能：自动故障转移，一个模型失败自动切换到备用模型
 */

// 模型优先级列表（按顺序尝试）
const MODEL_FALLBACKS = [
  'stepfun/step-3.5-flash:free',           // 主模型：阶跃星辰
  'arcee-ai/trinity-large-preview:free',   // 备用：Arcee Trinity
  'z-ai/glm-4.5-air:free',                 // 备用：智谱 GLM
  'nvidia/nemotron-3-super-120b-a12b:free', // 备用：NVIDIA Nemotron
];

export default async function handler(req, res) {
  // ========== 安全检查 ==========
  
  // 1. 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. CORS 配置（只允许来自你的域名）
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5000',
    'https://ai-kitchen.vercel.app',
    'https://www.bikini-bottom.store',
    // 添加你的自定义域名
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 3. 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 4. 输入验证
  const { messages, temperature, max_tokens, stream } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid messages format' });
  }

  if (messages.length === 0) {
    return res.status(400).json({ error: 'Messages cannot be empty' });
  }

  // 5. 验证消息内容（防止注入攻击）
  for (const msg of messages) {
    if (!msg.role || !msg.content) {
      return res.status(400).json({ error: 'Invalid message structure' });
    }
    // 限制单条消息长度（防止滥用）
    if (msg.content.length > 5000) {
      return res.status(400).json({ error: 'Message content too long (max 5000 chars)' });
    }
  }

  // ========== 调用 OpenRouter API（带故障转移）==========

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENROUTER_API_KEY not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // 尝试每个模型，直到成功
  let lastError = null;
  
  for (const model of MODEL_FALLBACKS) {
    try {
      console.log(`🔄 Trying model: ${model}`);
      
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': req.headers.origin || 'https://ai-kitchen.vercel.app',
          'X-Title': 'AI Kitchen',
        },
        body: JSON.stringify({
          model: model,
          messages,
          temperature: temperature || 0.9,
          max_tokens: max_tokens || 1800,
          stream: stream !== false, // 默认启用流式输出
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`❌ Model ${model} failed:`, response.status, errorData);
        lastError = { status: response.status, data: errorData, model };
        continue; // 尝试下一个模型
      }

      console.log(`✅ Model ${model} succeeded`);

      // ========== 流式响应 ==========
      if (stream) {
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

      return; // 成功，退出

    } catch (err) {
      console.error(`❌ Model ${model} exception:`, err);
      lastError = { status: 500, error: err.message, model };
    }
  }

  // 所有模型都失败了
  console.error('❌ All models failed');
  res.status(lastError?.status || 500).json({
    error: lastError?.data?.error?.message || lastError?.error || 'All models failed',
    triedModels: MODEL_FALLBACKS,
  });
}

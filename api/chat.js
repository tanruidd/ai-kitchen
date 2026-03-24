/**
 * 美味创意AI厨房 - 后端代理函数
 * Vercel Serverless Function
 * 
 * 作用：隐藏 API Key，代理前端请求到 OpenRouter
 */

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
  const { messages, model, temperature, max_tokens, stream } = req.body;

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

  // 6. 验证模型名称（只允许特定模型）
  const allowedModels = ['stepfun/step-3.5-flash:free'];
  if (!allowedModels.includes(model)) {
    return res.status(400).json({ error: 'Model not allowed' });
  }

  // ========== 调用 OpenRouter API ==========

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENROUTER_API_KEY not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': req.headers.origin || 'https://ai-kitchen.vercel.app',
        'X-Title': 'AI Kitchen',
      },
      body: JSON.stringify({
        model: model || 'stepfun/step-3.5-flash:free',
        messages,
        temperature: temperature || 0.9,
        max_tokens: max_tokens || 1800,
        stream: stream !== false, // 默认启用流式输出
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ OpenRouter API error:', response.status, errorData);
      return res.status(response.status).json({
        error: errorData.error?.message || 'API request failed',
      });
    }

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

  } catch (error) {
    console.error('❌ Server error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

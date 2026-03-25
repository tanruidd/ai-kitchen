/**
 * 美味创意AI厨房 - 图片搜索 API
 * Vercel Serverless Function
 *
 * 作用：代理 Pexels API，搜索美食图片
 */

export default async function handler(req, res) {
  // 只允许 GET 请求
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS 配置
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5000',
    'https://ai-kitchen.vercel.app',
    'https://www.bikini-bottom.store',
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  const { query, page = 1, per_page = 15 } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Query parameter required' });
  }

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.error('❌ PEXELS_API_KEY not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&page=${page}&per_page=${per_page}`,
      {
        headers: {
          Authorization: apiKey,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Pexels API error:', response.status, errorData);
      return res.status(response.status).json({
        error: errorData.error || 'API request failed',
      });
    }

    const data = await response.json();

    // 只返回需要的字段
    const photos = data.photos.map(photo => ({
      id: photo.id,
      width: photo.width,
      height: photo.height,
      url: photo.url,
      photographer: photo.photographer,
      src: {
        large: photo.src.large,
        medium: photo.src.medium,
        small: photo.src.small,
      },
      alt: photo.alt || query,
    }));

    res.status(200).json({
      photos,
      total_results: data.total_results,
      page: data.page,
      per_page: data.per_page,
    });

  } catch (error) {
    console.error('❌ Server error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
}

const https = require('https');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, s-maxage=300');

  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GNEWS_API_KEY not configured' });
  }

  const query = encodeURIComponent('brent crude oil OPEC');
  const path  = '/api/v4/search?q=' + query + '&lang=en&max=8&sortby=publishedAt&apikey=' + apiKey;

  const options = {
    hostname: 'gnews.io',
    path:     path,
    method:   'GET',
    headers:  { 'User-Agent': 'Mozilla/5.0' },
  };

  const request = https.get(options, function(response) {
    let data = '';
    response.on('data', function(chunk) { data += chunk; });
    response.on('end', function() {
      try {
        const json = JSON.parse(data);
        if (!json.articles || json.articles.length === 0) {
          return res.status(200).json({ articles: [] });
        }
        const articles = json.articles.map(function(a) {
          return {
            title:       a.title,
            url:         a.url,
            source:      a.source ? a.source.name : 'News',
            publishedAt: a.publishedAt,
          };
        });
        res.status(200).json({ articles: articles });
      } catch(e) {
        res.status(500).json({ error: 'Parse error: ' + e.message });
      }
    });
  });

  request.on('error', function(err) {
    res.status(500).json({ error: err.message });
  });

  request.setTimeout(8000, function() {
    request.destroy();
    res.status(504).json({ error: 'timeout' });
  });
};

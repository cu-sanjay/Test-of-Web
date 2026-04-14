import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const targetUrl = 'https://sports.ndtv.com/ipl-2026/points-table';

    // Step 1: Ultra-realistic browser headers to bypass basic WAFs
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1"
    };

    let html = '';
    let response = await fetch(targetUrl, { headers });

    // Step 2: If Vercel IP gets a 403, fallback to a free public proxy bypass
    if (!response.ok) {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
      const proxyResponse = await fetch(proxyUrl);
      
      if (!proxyResponse.ok) throw new Error(`Proxy failed with status: ${proxyResponse.status}`);
      
      const proxyData = await proxyResponse.json();
      html = proxyData.contents; // AllOrigins returns the raw HTML inside a 'contents' JSON key
    } else {
      html = await response.text();
    }

    const $ = cheerio.load(html);
    const pointsTable = [];

    $('.Ptb2Tb_tr.Ptb2Tb_act, .Ptb2Tb_tr').each((i, el) => {
      const cols = $(el).find('.Ptb2Tb_td');
      if (cols.length >= 9) {
        const position = $(cols[0]).text().trim();
        const team = $(cols[1]).find('.Ptb2Tb_tab-nweb').text().trim() || $(cols[1]).text().trim();
        const played = $(cols[2]).text().trim();
        const won = $(cols[3]).text().trim();
        const lost = $(cols[4]).text().trim();
        const tied = $(cols[5]).text().trim();
        const nr = $(cols[6]).text().trim();
        const points = $(cols[7]).text().trim();
        const nrr = $(cols[8]).text().trim();

        if (position && team && !isNaN(parseInt(position))) {
          pointsTable.push({
            position: parseInt(position),
            team,
            played: parseInt(played),
            won: parseInt(won),
            lost: parseInt(lost),
            tied: parseInt(tied),
            no_result: parseInt(nr),
            points: parseInt(points),
            nrr: parseFloat(nrr) || nrr
          });
        }
      }
    });

    res.status(200).json({ success: true, data: pointsTable });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching points table", error: error.message });
  }
}
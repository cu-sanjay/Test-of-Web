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
    const targetUrl = 'https://sports.ndtv.com/ipl-2026/schedules-fixtures';

    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none"
    };

    let html = '';
    let response = await fetch(targetUrl, { headers });

    // Proxy Fallback for 403s
    if (!response.ok) {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
      const proxyResponse = await fetch(proxyUrl);
      
      if (!proxyResponse.ok) throw new Error(`Proxy failed with status: ${proxyResponse.status}`);
      
      const proxyData = await proxyResponse.json();
      html = proxyData.contents;
    } else {
      html = await response.text();
    }

    const $ = cheerio.load(html);
    const matches = [];

    $('.sp-scr_wrp').each((i, el) => {
      try {
        const teamA = $(el).attr('data-teama');
        const teamB = $(el).attr('data-teamb');
        const venue = $(el).attr('data-venue');
        const dateId = $(el).attr('id'); 
        
        const status = $(el).find('.scr_inf-wrp .scr_dt-red').first().text().trim() || 'Upcoming';
        const result = $(el).find('.scr_inf-wrp .scr_dt-red').last().text().trim() || null;
        
        const teamsInfo = $(el).find('.scr_tm-wrp');
        const scoreA = $(teamsInfo[0]).find('.scr_tm-scr').text().trim() || null;
        const scoreB = $(teamsInfo[1]).find('.scr_tm-scr').text().trim() || null;

        matches.push({
          id: i + 1,
          date_raw: dateId,
          teamA,
          teamB,
          venue,
          status,
          result: result === status ? null : result, 
          scores: {
            [teamA]: scoreA,
            [teamB]: scoreB
          }
        });
      } catch (err) {
        // Skip malformed nodes gracefully
      }
    });

    res.status(200).json({ success: true, count: matches.length, data: matches });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching schedule data", error: error.message });
  }
}
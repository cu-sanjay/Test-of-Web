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
    const response = await fetch('https://sports.ndtv.com/ipl-2026/points-table', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) throw new Error(`Source returned status: ${response.status}`);
    
    const html = await response.text();
    const $ = cheerio.load(html);
    const pointsTable = [];

    // Parse specific active and default table rows
    $('.Ptb2Tb_tr.Ptb2Tb_act, .Ptb2Tb_tr').each((i, el) => {
      const cols = $(el).find('.Ptb2Tb_td');
      if (cols.length >= 9) {
        const position = $(cols[0]).text().trim();
        // Fallback checks just in case the source DOM alters slightly
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
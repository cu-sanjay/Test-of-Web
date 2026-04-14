import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  // CORS Headers to allow any web app to fetch freely
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Masking the fetch to bypass basic bot-blocking measures
    const response = await fetch('https://sports.ndtv.com/ipl-2026/schedules-fixtures', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });

    if (!response.ok) throw new Error(`Source returned status: ${response.status}`);
    
    const html = await response.text();
    const $ = cheerio.load(html);
    const matches = [];

    // Parse the HTML DOM directly mapping to the structure found on the page
    $('.sp-scr_wrp').each((i, el) => {
      try {
        const teamA = $(el).attr('data-teama');
        const teamB = $(el).attr('data-teamb');
        const venue = $(el).attr('data-venue');
        const dateId = $(el).attr('id'); 
        
        // Handling dynamic status/results logic
        const status = $(el).find('.scr_inf-wrp .scr_dt-red').first().text().trim() || 'Upcoming';
        const result = $(el).find('.scr_inf-wrp .scr_dt-red').last().text().trim() || null;
        
        // Extract scores if match has started/ended
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
        // Skip malformed nodes smoothly to avoid crashing the endpoint
      }
    });

    res.status(200).json({ success: true, count: matches.length, data: matches });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching schedule data", error: error.message });
  }
}
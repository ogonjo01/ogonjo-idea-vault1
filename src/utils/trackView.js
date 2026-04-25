// src/utils/trackView.js
import { supabase } from '../supabase/supabaseClient';

// ─────────────────────────────────────────────────────────────────────────────
// TRAFFIC SOURCE DETECTION
// ─────────────────────────────────────────────────────────────────────────────
const getSource = () => {
  const ref = document.referrer;
  if (!ref) return 'Direct';
  try {
    const host = new URL(ref).hostname.toLowerCase().replace('www.', '');

    // ── Search engines ────────────────────────────────────────────────────────
    if (host.includes('google'))       return 'Google';
    if (host.includes('bing'))         return 'Bing';
    if (host.includes('yahoo'))        return 'Yahoo';
    if (host.includes('duckduckgo'))   return 'DuckDuckGo';
    if (host.includes('yandex'))       return 'Yandex';
    if (host.includes('baidu'))        return 'Baidu';
    if (host.includes('ecosia'))       return 'Ecosia';
    if (host.includes('brave'))        return 'Brave Search';
    if (host.includes('ask.com'))      return 'Ask';
    if (host.includes('aol'))          return 'AOL';
    if (host.includes('startpage'))    return 'Startpage';
    if (host.includes('dogpile'))      return 'Dogpile';
    if (host.includes('swisscows'))    return 'Swisscows';
    if (host.includes('qwant'))        return 'Qwant';
    if (host.includes('naver'))        return 'Naver';
    if (host.includes('daum'))         return 'Daum';
    if (host.includes('sogou'))        return 'Sogou';
    if (host.includes('seznam'))       return 'Seznam';

    // ── Social — Meta ─────────────────────────────────────────────────────────
    if (host.includes('facebook') || host === 'fb.com' || host === 'fb.me' || host === 'l.facebook.com') return 'Facebook';
    if (host.includes('instagram'))    return 'Instagram';
    if (host.includes('threads.net'))  return 'Threads';

    // ── Social — Twitter / X ──────────────────────────────────────────────────
    if (host.includes('twitter') || host === 't.co' || host.includes('x.com')) return 'Twitter/X';

    // ── Social — Microsoft ────────────────────────────────────────────────────
    if (host.includes('linkedin'))     return 'LinkedIn';

    // ── Social — Video ────────────────────────────────────────────────────────
    if (host.includes('youtube') || host === 'youtu.be') return 'YouTube';
    if (host.includes('tiktok'))       return 'TikTok';
    if (host.includes('vimeo'))        return 'Vimeo';
    if (host.includes('dailymotion')) return 'Dailymotion';
    if (host.includes('twitch'))       return 'Twitch';

    // ── Social — Messaging ────────────────────────────────────────────────────
    if (host.includes('whatsapp') || host === 'wa.me') return 'WhatsApp';
    if (host.includes('telegram') || host === 't.me') return 'Telegram';
    if (host.includes('discord'))      return 'Discord';
    if (host.includes('slack'))        return 'Slack';
    if (host.includes('snapchat'))     return 'Snapchat';
    if (host.includes('signal'))       return 'Signal';
    if (host.includes('viber'))        return 'Viber';
    if (host.includes('wechat') || host.includes('weixin')) return 'WeChat';
    if (host.includes('line.me'))      return 'Line';
    if (host.includes('kik'))          return 'Kik';

    // ── Social — Communities ──────────────────────────────────────────────────
    if (host.includes('reddit'))       return 'Reddit';
    if (host.includes('pinterest'))    return 'Pinterest';
    if (host.includes('quora'))        return 'Quora';
    if (host.includes('tumblr'))       return 'Tumblr';
    if (host.includes('mastodon'))     return 'Mastodon';
    if (host.includes('bereal'))       return 'BeReal';
    if (host.includes('clubhouse'))    return 'Clubhouse';
    if (host.includes('nextdoor'))     return 'Nextdoor';
    if (host.includes('mix.com'))      return 'Mix';
    if (host.includes('flipboard'))    return 'Flipboard';

    // ── Publishing / Newsletters ──────────────────────────────────────────────
    if (host.includes('medium'))       return 'Medium';
    if (host.includes('substack'))     return 'Substack';
    if (host.includes('ghost'))        return 'Ghost';
    if (host.includes('wordpress'))    return 'WordPress';
    if (host.includes('blogger') || host.includes('blogspot')) return 'Blogger';
    if (host.includes('hashnode'))     return 'Hashnode';
    if (host.includes('devto') || host === 'dev.to') return 'Dev.to';
    if (host.includes('beehiiv'))      return 'Beehiiv';

    // ── Email webmail ─────────────────────────────────────────────────────────
    if (host.includes('mail.google') || host.includes('gmail')) return 'Email';
    if (host.includes('outlook') || host.includes('hotmail') || host.includes('live.com')) return 'Email';
    if (host.includes('yahoo.com') && ref.includes('mail'))     return 'Email';
    if (host.includes('proton') || host.includes('protonmail')) return 'Email';
    if (host.includes('zoho'))         return 'Email';
    if (host.includes('mail.ru'))      return 'Email';
    if (host.includes('ymail'))        return 'Email';

    // ── African platforms ─────────────────────────────────────────────────────
    if (host.includes('jumia'))        return 'Jumia';
    if (host.includes('nairaland'))    return 'Nairaland';
    if (host.includes('pulse.ng') || host.includes('pulse.ug') || host.includes('pulse.gh')) return 'Pulse Africa';
    if (host.includes('techcabal'))    return 'TechCabal';
    if (host.includes('techpoint'))    return 'Techpoint';
    if (host.includes('disrupt-africa')) return 'Disrupt Africa';

    // ── AI / new platforms ────────────────────────────────────────────────────
    if (host.includes('perplexity'))   return 'Perplexity';
    if (host.includes('chatgpt') || host.includes('openai')) return 'ChatGPT';
    if (host.includes('claude'))       return 'Claude';
    if (host.includes('gemini') || host.includes('bard')) return 'Google Gemini';

    // ── Fallback — return the actual domain so you still see it ───────────────
    return host;
  } catch {
    return 'Unknown';
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GEO DETECTION  (cached per session — only 1 API call ever)
// ─────────────────────────────────────────────────────────────────────────────
let geoCache = null;

const getGeo = async () => {
  if (geoCache) return geoCache;
  try {
    const res = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error('geo failed');
    const data = await res.json();
    geoCache = {
      country: data.country_name || null,
      city:    data.city         || null,
    };
  } catch {
    // Never block a view recording because of a geo failure
    geoCache = { country: null, city: null };
  }
  return geoCache;
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT — call this wherever you insert a view
// ─────────────────────────────────────────────────────────────────────────────
export const trackView = async (postId) => {
  if (!postId) return;

  const [geo, source] = await Promise.all([
    getGeo(),
    Promise.resolve(getSource()),
  ]);

  const { error } = await supabase.from('views').insert({
    post_id: postId,
    country: geo.country,
    city:    geo.city,
    source,
  });

  if (error) console.error('trackView error', error);
};

export { getGeo, getSource };
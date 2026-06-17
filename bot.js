/**
 * Telegraf Telegram Bot - Inline Search & Command Script (Node.js)
 * 
 * Runs on a free Render or Railway server to:
 * 1. Listen for user messages like /start, /register
 * 2. Handle inline query inputs (e.g. typing @YourBotName cement) in any chat
 * 3. Fetch data dynamically from Google sheets API to return results instantly
 */

const { Telegraf } = require('telegraf');
const axios = require('axios');
const http = require('http');

const PORT = process.env.PORT || 3000;

// Initialize Telegraf Bot Token from env or fallback hardcoded template token
const rawToken = process.env.BOT_TOKEN || "8989190193:AAH48wySFuH4p4qcpYeQLhkn0q7Ar-bJoC0";
const cleanToken = rawToken.trim();

const isDummyToken = !cleanToken || 
                     cleanToken.includes("YOUR") || 
                     cleanToken === "undefined" || 
                     cleanToken === "";

let bot = null;

if (isDummyToken) {
  console.warn("⚠️ WARNING: No valid Telegram BOT_TOKEN detected in environment variables!");
  console.warn("Please add a variable named 'BOT_TOKEN' in your Render Dashboard settings containing your live Telegram API key.");
} else {
  try {
    bot = new Telegraf(cleanToken);
  } catch (err) {
    console.error("❌ Failed to instantiate Telegraf bot:", err.message);
  }
}

// Google Apps Script or other middleware database endpoint URL
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || 
                         process.env.GOOGLE_SHEET_MIDDLEWARE || 
                         process.env.GOOGLE_SHEETS_URL || 
                         "https://script.google.com/macros/s/AKfycbyaJnrBf8I7Ky9hnpiyqGpcMW__0zW-dXM0cjyT41dMPSHFg8LmqNwUmIXpt8Qk1zob/exec";

if (bot) {
  // Helper to get robust, secure, production-ready HTTPS Launch URL
  function getLaunchUrl() {
    const rawUrl = process.env.MINI_APP_URL || "https://yohannes-ade.github.io/Conbridge-Material-Directory/";
    if (!rawUrl || rawUrl.includes("YOUR") || rawUrl.trim() === "") {
      return "https://Con_bridgeBot.github.io/conbridge-material-directory/";
    }
    let cleanUrl = rawUrl.trim();
    if (cleanUrl.startsWith("http://")) {
      cleanUrl = "https://" + cleanUrl.slice(7);
    } else if (!cleanUrl.startsWith("https://")) {
      cleanUrl = "https://" + cleanUrl;
    }
    return cleanUrl;
  }

  // Welcome start trigger with inline main menu launcher
  bot.start(async (ctx) => {
    try {
      const launchUrl = getLaunchUrl();
      await ctx.replyWithMarkdown(`🏗️ *Welcome to the Conbridge Construction Material Directory Bot!*

Our system serves both Builders and Materials Suppliers. 

👉 *For Suppliers / Traders:*
Click the button below or use the Bottom-Left Menu Button to register your business, publish prices and showcase products directly!

👉 *For Contractors / Buyers:*
Open the interactive interface to browse catalog items, search prices, and contact sellers.

💡 *Inline Search:* Type \`@${ctx.botInfo?.username || 'Con_bridgeBot'} [material]\` in any chat to pull up supplier cards immediately!

Enjoy our free directory! 🇪🇹`, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🚀 Open Materials Directory", web_app: { url: launchUrl } }
            ],
            [
              { text: "❔ View Guide Menu", callback_data: "show_help" }
            ]
          ]
        }
      });
    } catch (err) {
      console.error("❌ Telegram start command issue:", err.message);
      try {
        await ctx.replyWithMarkdown(`🏗️ *Welcome to the Conbridge Construction Material Bot!*

👉 *Suppliers:* Send /register to write your trading card.
👉 *Buyers:* Send /directory to browse construction stores.

⚠️ *Developer WebApp URL Warning:* Telegram rejected opening the menu because your hosted link is not using secure **HTTPS**. Ensure the URL starts strictly with **https://**.`);
      } catch (innerErr) {
        console.error("Default welcome fallback failed:", innerErr.message);
      }
    }
  });

  bot.command('register', async (ctx) => {
    try {
      const launchUrl = getLaunchUrl();
      await ctx.reply('To register, simply click on the button below or click the bottom-left Menu Button!', {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🏗️ Open Registration Portal", web_app: { url: launchUrl } }
            ]
          ]
        }
      });
    } catch (err) {
      console.error("❌ Telegram register command issue:", err.message);
      try {
        await ctx.reply('Please register your construction profile using the bottom-left WebApp Menu Button.');
      } catch (innerErr) {
        console.error("Register fallback failed:", innerErr.message);
      }
    }
  });

  bot.command('directory', async (ctx) => {
    try {
      const launchUrl = getLaunchUrl();
      await ctx.reply('Browse building materials and locate suppliers using our interactive Mini App!', {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🔍 Open Materials App", web_app: { url: launchUrl } }
            ]
          ]
        }
      });
    } catch (err) {
      console.error("❌ Telegram directory command issue:", err.message);
      try {
        await ctx.reply('Please launch the interactive Materials Directory inside the bottom left screen launcher button.');
      } catch (innerErr) {
        console.error("Directory fallback failed:", innerErr.message);
      }
    }
  });

  bot.command('help', async (ctx) => {
    try {
      await ctx.replyWithMarkdown(`❔ *How to use the Directory System*

• Click the Bottom Left *Mini App Menu Button* or use the inline welcome button to launch the directory.
• Search for wholesalers on the *Directory* screen.
• Register your business on the *Register Partner* screen to get high-impact visibility on our channels.
• Use Inline query anytime: Type \`@${ctx.botInfo?.username || 'Con_bridgeBot'} [product_keyword]\` to view cards on-the-fly!`);
    } catch (err) {
      console.error("❌ Help trigger help failing:", err.message);
    }
  });

  // Handle callback triggers
  bot.on('callback_query', async (ctx) => {
    if (ctx.callbackQuery.data === 'show_help') {
      try {
        await ctx.answerCbQuery();
        await ctx.replyWithMarkdown(`❔ *How to use the Directory System*

• Click the Bottom Left *Mini App Menu Button* or use the inline welcome button to launch the directory.
• Search for wholesalers on the *Directory* screen.
• Register your business on the *Register Partner* screen to get high-impact visibility on our channels.
• Use Inline query anytime: Type \`@${ctx.botInfo?.username || 'Con_bridgeBot'} [product_keyword]\` to view cards on-the-fly!`);
      } catch (err) {
        console.error("Callback handler error:", err.message);
      }
    }
  });

  // Inline queries handle
  bot.on('inline_query', async (ctx) => {
    const query = ctx.inlineQuery.query.trim().toLowerCase();
    
    try {
      // 1. Load latest supplier catalog lists from Google App Script Sheets URL
      const response = await axios.get(`${APPS_SCRIPT_URL}?action=getSuppliers`);
      const suppliers = response.data.data;
      
      // 2. Filter list based on inline search term
      const filtered = suppliers.filter(sup => {
        if (!query) return true; // Show all
        return (
          sup.businessName.toLowerCase().includes(query) ||
          sup.location.toLowerCase().includes(query) ||
          sup.categories.join(' ').toLowerCase().includes(query) ||
          sup.products.some(p => p.name.toLowerCase().includes(query))
        );
      });

      // 3. Map filtered suppliers to Telegram Inline Results
      const results = filtered.slice(0, 15).map(sup => {
        let productsTxt = sup.products.map(p => `• ${p.name} (${p.spec}): ${p.price}\n`).join('');
        
        let messageContent = `🏗️ *SUPPLIER: ${sup.businessName}*
📍 *Location:* ${sup.location}
🏷️ *Branch Category:* ${sup.categories.join(', ')}

🛍️ *Featured Catalog:*
${productsTxt || 'No catalog prices published'}
📦 *MOQ:* ${sup.minOrder}
🚛 *Delivery available:* ${sup.delivery}

👤 *Seller:* ${sup.contactName}
📞 *Phone:* ${sup.phone}
${sup.telegramUsername ? `📱 *Telegram:* @${sup.telegramUsername.replace('@','')}` : ''}`;

        return {
          type: 'article',
          id: sup.id,
          title: sup.businessName,
          description: `📍 Location: ${sup.location} | Categories: ${sup.categories.join(', ')}`,
          input_message_content: {
            message_text: messageContent,
            parse_mode: 'Markdown'
          },
          reply_markup: {
            inline_keyboard: [
              [
                { text: '💬 Chat on Telegram', url: sup.telegramUsername ? `https://t.me/${sup.telegramUsername.replace('@','')}` : `https://t.me/Con_bridgeBot` }
              ]
            ]
          }
        };
      });

      return await ctx.answerInlineQuery(results, { cache_time: 10 });
      
    } catch (err) {
      console.error("Inline query processing crash:", err.message);
      
      // Fallback: Send static response if sheet connectivity is pending
      return await ctx.answerInlineQuery([
        {
          type: 'article',
          id: 'fallback_1',
          title: 'Pending Google Sheets Setup',
          description: 'Set your APPS_SCRIPT_URL in your server to enable inline queries',
          input_message_content: {
            message_text: '⚠️ Hello! The bot is currently waiting for step 6 (Google Sheets backend connectivity setup) to retrieve live directory records.'
          }
        }
      ]);
    }
  });

  const EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_URL;

  if (EXTERNAL_URL) {
    // Webhook Mode (For zero-downtime, conflict-free hosting on Render)
    const webhookPath = `/webhook-${cleanToken.slice(-10)}`;
    const fullWebhookUrl = `${EXTERNAL_URL}${webhookPath}`;
    
    const webhookHandler = bot.webhookCallback(webhookPath);
    
    const server = http.createServer((req, res) => {
      if (req.url === webhookPath && req.method === 'POST') {
        webhookHandler(req, res);
      } else if (req.url === '/' || req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Conbridge Construction Material Telegram Bot is running via Webhook! - Healthy\n');
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found\n');
      }
    });
    
    server.listen(PORT, '0.0.0.0', async () => {
      console.log(`📡 Web health-check server and webhook bound to port ${PORT}`);
      try {
        console.log(`⚙️ Requesting Telegram register webhook URL: ${fullWebhookUrl}`);
        await bot.telegram.setWebhook(fullWebhookUrl);
        console.log("✅ Webhook successfully configured in Telegram!");
      } catch (err) {
        console.error("❌ Failed to register webhook in Telegram:", err.message);
      }
    });

    process.once('SIGINT', () => { server.close(); });
    process.once('SIGTERM', () => { server.close(); });
  } else {
    // Long Polling Mode Fallback (For simple local development or other nodes)
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Conbridge Construction Material Telegram Bot is running via Polling! - Healthy\n');
    });

    server.listen(PORT, '0.0.0.0', () => {
      console.log('📡 Web health-check server (Polling mode) listening on port ' + PORT);
    });

    bot.launch()
      .then(() => {
        console.log("🚀 Telegram Bot is successfully listening/polling!");
      })
      .catch((err) => {
        console.error("❌ ERROR: Telegram Bot failed to launch polling:", err.message);
        console.warn("⚠️ Rendering is kept alive to prevent container collapse. Please check your BOT_TOKEN environment variable!");
      });

    process.once('SIGINT', () => {
      bot.stop('SIGINT');
      server.close();
    });
    process.once('SIGTERM', () => {
      bot.stop('SIGTERM');
      server.close();
    });
  }
} else {
  // Web Fallback if Bot is not instantiated due to dummy token
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('🛰️ System is running in web-only fallback mode. Define BOT_TOKEN to activate Telegram bot hooks.\n');
  });
  server.listen(PORT, '0.0.0.0', () => {
    console.log("🛰️ System is running in web-only fallback mode on port " + PORT);
  });
}

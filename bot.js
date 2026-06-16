const { Telegraf } = require('telegraf');
const axios = require('axios');

// Fetch values from environment variables
const botToken = process.env.BOT_TOKEN;
const appsScriptUrl = process.env.APPS_SCRIPT_URL;

if (!botToken) {
  console.error("CRITICAL ERROR: BOT_TOKEN is missing!");
  process.exit(1);
}

const bot = new Telegraf(botToken);

// Welcome start trigger
bot.start((ctx) => {
  ctx.replyWithMarkdown(`🏗️ *Welcome to the Addis Ababa Construction Supplier Directory Bot!*

Our system serves both Builders and Materials Suppliers. 

👉 *For Suppliers / Traders:*
Click the menu button below, register your business, publish prices and showcase products directly!

👉 *For Contractors / Buyers:*
Type your material needs into our interactive interface.
You can also search *inline* in ANY chat window by typing:
@${ctx.botInfo.username} cement
@${ctx.botInfo.username} rebar

Enjoy our free directory! 🇪🇹`);
});

bot.command('register', (ctx) => {
  ctx.reply('To register, simply click on the Menu Button below or use the Mini App to fill out the Supplier Card Form!');
});

bot.command('directory', (ctx) => {
  ctx.reply('Browse materials and locations. Use the Mini App by clicking the bottom menu key!');
});

bot.command('help', (ctx) => {
  ctx.replyWithMarkdown(`❔ *How to use the Directory System*

• Click the Bottom Left *Mini App Menu Button* to launch the directory.
• Search for wholesalers on the *Directory* screen.
• Register your business on the *Register Partner* screen to get high-impact visibility on our channels.
• Use Inline query anytime: Type \`@${ctx.botInfo.username} [product_keyword]\` to view cards on-the-fly!`);
});

// Inline queries handle
bot.on('inline_query', async (ctx) => {
  const query = ctx.inlineQuery.query.trim().toLowerCase();
  
  try {
    if (!appsScriptUrl) {
      return await ctx.answerInlineQuery([
        {
          type: 'article',
          id: 'error_setup',
          title: 'Google Sheet Setup Needed',
          description: 'The bot requires APPS_SCRIPT_URL configured on Render dashboard to fetch real-time items.',
          input_message_content: {
            message_text: '⚠️ Hello! The bot is currently waiting for Google Sheets configurations to retrieve live directory records.'
          }
        }
      ]);
    }

    // 1. Load latest supplier lists from Google App Script Sheets URL
    const response = await axios.get(`${appsScriptUrl}?action=getSuppliers`);
    const suppliers = response.data.data;
    
    // 2. Filter list based on inline search term
    const filtered = suppliers.filter(sup => {
      if (!query) return true; // Show all if nothing typed
      return (
        sup.businessName.toLowerCase().includes(query) ||
        sup.location.toLowerCase().includes(query) ||
        sup.categories.join(' ').toLowerCase().includes(query) ||
        sup.products.some(p => p.name.toLowerCase().includes(query))
      );
    });

    // 3. Map filtered suppliers to Telegram Inline Results
    const results = filtered.slice(0, 15).map(sup => {
      let productsTxt = sup.products.map(p => `• ${p.name} (${p.spec}): ${p.price}`).join('\n');
      
      let messageContent = `🏗️ *SUPPLIER: ${sup.businessName}*
📍 *Location:* ${sup.location}
🏷️ *Category:* ${sup.categories.join(', ')}

🛍 *Featured Catalog:*
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
        description: `📍 Location: ${sup.location} & Categories: ${sup.categories.join(', ')}`,
        input_message_content: {
          message_text: messageContent,
          parse_mode: 'Markdown'
        },
        reply_markup: {
          inline_keyboard: [
            [
              { text: '💬 Chat on Telegram', url: sup.telegramUsername ? `https://t.me/${sup.telegramUsername.replace('@','')}` : `tel:${sup.phone}` }
            ]
          ]
        }
      };
    });

    return await ctx.answerInlineQuery(results, { cache_time: 10 });
    
  } catch (err) {
    console.error("Inline query processing error:", err.message);
    return await ctx.answerInlineQuery([]);
  }
});

// Launch bot server
bot.launch().then(() => {
  console.log("Telegram bot is running successfully!");
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

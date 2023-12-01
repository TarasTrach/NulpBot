const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot('6498507773:AAFAGwi5roY4XmvIb-gtQENAxaGV-q3G5uI', { polling: true });

bot.onText(/\/start/, (msg) => {
   const chatId = msg.chat.id;
   bot.sendMessage(chatId, 'Тест легендарного бота успішний');
});

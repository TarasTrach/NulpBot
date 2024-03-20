const { BackOption, CourseOptions, InstituteOptions_1, InstituteOptions_2, InstituteOptions_3,
   IKTA_1_Speciality, IKTA_2_Speciality, KI_1_Options, KI_2_Options, } = require('./options');
const { AnnouncementModel, UserModel } = require('./models/models.js');
const fs = require('fs');
const options = require('./options');
const userSteps = {};

const textForHalyava = 'Зверніть увагу, що файли мають право завантажувати будь-які користувачі(не все може бути якісне)🙃\nЯкщо маєте бажання завантажити щось - писати @nulpsupport';

const mainMenuFilePath = 'C:/#thcbot/nulpBot/nulpbot/text_files/main_menu.txt';
const mainMenuText = readTextFromFile(mainMenuFilePath);

const mainMenuKeyboard = {
   reply_markup: {
      inline_keyboard: [
         [{ text: '🔎Швидкий пошук', callback_data: 'find_menu' }, { text: '📅Останнє оновлення', callback_data: 'last_update' },],
         [{ text: '📧Можливості пошти Політехніки', callback_data: 'mail_opportunities' },]
      ],
   },
   noChunking: true,
   parse_mode: "Markdown",
};




const callbacks = {
   'main_menu': async (chatId) => {
      const text = mainMenuText;
      const options = mainMenuKeyboard;
      return { text, options, chatId };
   },

   'find_menu': async (chatId) => {

      const courseNumber = await getCourseNumber(chatId);
      switch (courseNumber) {
         case 1:
            return { text: '📖Виберіть інститут', options: InstituteOptions_1, chatId };
         case 2:
            return { text: '📖Виберіть інститут', options: InstituteOptions_2, chatId };
         case 3:
            return { text: '📖Виберіть інститут', options: InstituteOptions_3, chatId };
      }
   },

   'last_update': async (chatId) => {
      const filePath = 'C:/#thcbot/nulpBot/nulpbot/text_files/last_update.txt';
      const options = {
         noChunking: true,
         reply_markup: {
            inline_keyboard: [
               [{ text: '🔙Назад', callback_data: 'main_menu' }],
            ]
         }
      };
      const text = readTextFromFile(filePath);
      return { text, options, chatId };
   },

   'mail_opportunities': async (chatId) => {
      const filePath = 'C:/#thcbot/nulpBot/nulpbot/text_files/mail_opportunities.txt';
      const options = {
         parse_mode: "Markdown",
         noChunking: true,
         reply_markup: {
            inline_keyboard: [
               [{ text: '🔙Назад', callback_data: 'main_menu' }],
            ]
         }
      };
      let text = readTextFromFile(filePath);

      // Замінюємо посилання на відповідний формат Markdown
      text = text.replace(/GitHub Students Pack/g, '[GitHub Students Pack](https://education.github.com/pack)');
      text = text.replace(/Google Drive Unlimited/g, '[Google Drive Unlimited](https://www.google.com/drive/)');
      text = text.replace(/JetBrains All-In-One IDEs Pack/g, '[JetBrains All-In-One IDEs Pack](https://www.jetbrains.com/lp/leaflets-gdc/students/)');

      return { text, options, chatId };
   },

   // -------------------------------------------------------------------------------------------------------------------------------------------------------------

   'IKTA_1': async (chatId) => {
      return { text: '👨‍💻Виберіть спеціальність (1 Курс)', options: IKTA_1_Speciality, chatId };
   },

   'IKTA_2': async (chatId) => {
      return { text: '👨‍💻Виберіть спеціальність (2 Курс)', options: IKTA_2_Speciality, chatId };
   },

   'IKTA_3': async (chatId) => {
      return { text: '👨‍💻Виберіть спеціальність (3 Курс)', options: IKTA_3_Speciality, chatId };
   },

   'KI_1': async (chatId) => {
      return { text: '📕Виберіть предмет:', options: KI_1_Options, chatId };
   },

   'KI_2': async (chatId) => {
      return { text: '📕Виберіть предмет:', options: KI_2_Options, chatId };
   },




   'KI_1_1': async (chatId) => {
      const text = await getAnnouncementText('KI_1_1');
      const options = addButtonToBackOption('Халява', 'KI_1_1_H');
      return { text, options: options, chatId };
   },

   'KI_1_2': async (chatId) => {
      const text = await getAnnouncementText('KI_1_2');
      const options = addButtonToBackOption('Халява', 'KI_1_2_H');
      return { text, options: options, chatId };
   },

   'KI_1_3': async (chatId) => {
      const text = await getAnnouncementText('KI_1_3');
      const options = addButtonToBackOption('Халява', 'KI_1_3_H');
      return { text, options: options, chatId };
   },

   'KI_1_4': async (chatId) => {
      const text = await getAnnouncementText('KI_1_4');
      const options = addButtonToBackOption('Халява', 'KI_1_4_H');
      return { text, options: options, chatId };
   },

   'KI_1_5': async (chatId) => {
      const text = await getAnnouncementText('KI_1_5');
      const options = addButtonToBackOption('Халява', 'KI_1_5_H');
      return { text, options: options, chatId };
   },

   'KI_1_6': async (chatId) => {
      const text = await getAnnouncementText('KI_1_6');
      const options = addButtonToBackOption('Халява', 'KI_1_6_H');
      return { text, options: options, chatId };
   },

   'KI_1_7': async (chatId) => {
      const text = await getAnnouncementText('KI_1_7');
      const options = addButtonToBackOption('Халява', 'KI_1_7_H');
      return { text, options: options, chatId };
   },

   'KI_1_1_H': async (chatId) => {
      const filePath = 'C:/#thcbot/nulpbot/Halyava/1 Курс/КІ/Вишмат'; // Шлях до файлу
      const { lastModifiedMessage } = getLastModifiedTimeAndMessage(filePath); // Отримання дати останніх змін
      const spoiler = `_${lastModifiedMessage}_`

      const text = `${textForHalyava}\n${spoiler}`;
      const options = { ...BackOption, parse_mode: 'Markdown', noChunking: true, };

      return { text, options, chatId, folderPath: filePath };
   },

   'KI_1_2_H': async (chatId) => {
      const filePath = 'C:/#thcbot/nulpbot/Halyava/1 Курс/КІ/ООФК'; // Шлях до файлу
      const { lastModifiedMessage } = getLastModifiedTimeAndMessage(filePath); // Отримання дати останніх змін
      const spoiler = `_${lastModifiedMessage}_`

      const text = `${textForHalyava}\n${spoiler}`;
      const options = { ...BackOption, parse_mode: 'Markdown', noChunking: true, };

      return { text, options, chatId, folderPath: filePath };
   },

   'KI_1_3_H': async (chatId) => {
      const filePath = 'C:/#thcbot/nulpbot/Halyava/1 Курс/КІ/Фізика'; // Шлях до файлу
      const { lastModifiedMessage } = getLastModifiedTimeAndMessage(filePath); // Отримання дати останніх змін
      const spoiler = `_${lastModifiedMessage}_`

      const text = `${textForHalyava}\n${spoiler}`;
      const options = { ...BackOption, parse_mode: 'Markdown', noChunking: true, };

      return { text, options, chatId, folderPath: filePath };
   },

   'KI_1_4_H': async (chatId) => {
      const filePath = 'C:/#thcbot/nulpbot/Halyava/1 Курс/КІ/Програмування'; // Шлях до файлу
      const { lastModifiedMessage } = getLastModifiedTimeAndMessage(filePath); // Отримання дати останніх змін
      const spoiler = `_${lastModifiedMessage}_`

      const text = `${textForHalyava}\n${spoiler}`;
      const options = { ...BackOption, parse_mode: 'Markdown', noChunking: true, };

      return { text, options, chatId, folderPath: filePath };
   },

   'KI_1_5_H': async (chatId) => {
      const filePath = 'C:/#thcbot/nulpbot/Halyava/1 Курс/КІ/Дискретка'; // Шлях до файлу
      const { lastModifiedMessage } = getLastModifiedTimeAndMessage(filePath); // Отримання дати останніх змін
      const spoiler = `_${lastModifiedMessage}_`

      const text = `${textForHalyava}\n${spoiler}`;
      const options = { ...BackOption, parse_mode: 'Markdown', noChunking: true, };

      return { text, options, chatId, folderPath: filePath };
   },

   'KI_1_6_H': async (chatId) => {
      const filePath = 'C:/#thcbot/nulpbot/Halyava/1 Курс/КІ/Історія'; // Шлях до файлу
      const { lastModifiedMessage } = getLastModifiedTimeAndMessage(filePath); // Отримання дати останніх змін
      const spoiler = `_${lastModifiedMessage}_`

      const text = `${textForHalyava}\n${spoiler}`;
      const options = { ...BackOption, parse_mode: 'Markdown', noChunking: true, };

      return { text, options, chatId, folderPath: filePath };
   },

   'KI_1_7_H': async (chatId) => {
      const filePath = 'C:/#thcbot/nulpbot/Halyava/1 Курс/КІ/Українська мова'; // Шлях до файлу
      const { lastModifiedMessage } = getLastModifiedTimeAndMessage(filePath); // Отримання дати останніх змін
      const spoiler = `_${lastModifiedMessage}_`

      const text = `${textForHalyava}\n${spoiler}`;
      const options = { ...BackOption, parse_mode: 'Markdown', noChunking: true, };

      return { text, options, chatId, folderPath: filePath };
   },




   'KI_2_1': async (chatId) => {
      const text = await getAnnouncementText('KI_2_1');
      const options = addButtonToBackOption('Халява', 'KI_2_1_H');
      return { text, options: options, chatId };
   },

   'KI_2_1_H': async (chatId) => {
      const filePath = 'C:/#thcbot/nulpbot/Halyava/2 Курс/КІ/КЛ'; // Шлях до файлу
      const { lastModifiedMessage } = getLastModifiedTimeAndMessage(filePath); // Отримання дати останніх змін
      const spoiler = `_${lastModifiedMessage}_`

      const text = `${textForHalyava}\n${spoiler}`;
      const options = { ...BackOption, parse_mode: 'Markdown', noChunking: true, };

      return { text, options, chatId, folderPath: filePath };
   },

   'KI_2_2': async (chatId) => {
      const text = await getAnnouncementText('KI_2_2');
      const options = BackOption;
      return { text, options: options, chatId };
   },

   'KI_2_3': async (chatId) => {
      const text = await getAnnouncementText('KI_2_3');
      const options = BackOption;
      return { text, options: options, chatId };
   },

   'KI_2_4': async (chatId) => {
      const text = await getAnnouncementText('KI_2_4');
      const options = BackOption;
      return { text, options: options, chatId };
   },
};

const getCourseNumber = async (userId) => {
   try {
      const user = await UserModel.findOne({ userId });
      return user ? user.course : 1; // Повертаємо 1, якщо користувач не знайдений
   } catch (error) {
      console.error('Помилка при отриманні номеру курсу:', error);
      return 1; // Повертаємо 1 у випадку помилки
   }
};

const getAnnouncementText = async (option) => {
   try {
      const announcements = await AnnouncementModel.find({ option, isActive: true });

      if (announcements.length > 0) {
         const texts = announcements.map((announcement) => announcement.properties.text);
         return texts.join('\n\n'); // Повертаємо всі текстові оголошення, розділені новим рядком
      } else {
         return 'Ми не знайшли оголошень для цього предмету😕';
      }
   } catch (error) {
      console.error('Помилка при отриманні оголошень з бази даних:', error);
      return 'Помилка при отриманні оголошень.';
   }
};

const addButtonToBackOption = (text, callback_data) => {
   // Клонуємо BackOption у новий об'єкт
   const newOptions = JSON.parse(JSON.stringify(BackOption));

   // Отримуємо inline_keyboard з newOptions
   const inlineKeyboard = JSON.parse(newOptions.reply_markup).inline_keyboard || [];

   // Додаємо нову кнопку
   inlineKeyboard.push([{ text, callback_data }]);

   // Оновлюємо newOptions з новим inline_keyboard
   newOptions.reply_markup = JSON.stringify({ inline_keyboard: inlineKeyboard });

   return newOptions;
};

// Функція для отримання дати останніх змін файлу та створення повідомлення
function getLastModifiedTimeAndMessage(filePath) {
   try {
      const stats = fs.statSync(filePath);
      const lastModifiedTime = stats.mtime; // Дата останніх змін

      const day = String(lastModifiedTime.getDate()).padStart(2, '0');
      const month = String(lastModifiedTime.getMonth() + 1).padStart(2, '0');
      const year = lastModifiedTime.getFullYear();

      const lastModifiedMessage = `Останній раз файли було додано: ${day}.${month}.${year}`; // Повідомлення з датою у форматі "18.03.2024"
      return { lastModifiedTime, lastModifiedMessage };
   } catch (error) {
      console.error('Помилка при отриманні дати останніх змін:', error);
      return { lastModifiedTime: null, lastModifiedMessage: 'Помилка при отриманні дати останніх змін' };
   }
}

// Функція для зчитування вмісту файлу
function readTextFromFile(filePath) {
   try {
      // Зчитування вмісту файлу з кодуванням utf-8
      const text = fs.readFileSync(filePath, 'utf-8');
      return text;
   } catch (error) {
      console.error('Помилка при зчитуванні файлу:', error);
      return null;
   }
}






module.exports = { callbacks, getCourseNumber, userSteps, getAnnouncementText, mainMenuText, mainMenuKeyboard };

const TelegramApi = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const Token = '6498507773:AAFAGwi5roY4XmvIb-gtQENAxaGV-q3G5uI';
const bot = new TelegramApi(Token, {
   polling: {
      interval: 100, //------------------ Інтервал відповіді між сервером і клієнтом(мс)
      autoStart: true, //---------------- Приймає команди після того як був запущений(true)
   }
});

const { AnnouncementModel, UniqueCodeModel, SellerModel, UserModel, UserStepsModel } = require('./models/models.js');

// -------------------------------DATABASE---------------------------------------------------------------------
// URL з'єднання з вашою базою даних MongoDB. Замініть на свій URL.
const dbUrl = 'mongodb+srv://Revorved1:vdthbr010583@nulpbot.cmxg3q7.mongodb.net/';

// Підключення до бази даних
mongoose.connect(dbUrl, {
   useNewUrlParser: true,
   useUnifiedTopology: true,
});

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'Помилка підключення до бази даних:'));
db.once('open', () => {
   console.log('Підключено до бази даних');
});

async function generateUniqueCode(chatId, durationCode) {
   try {
      // Перевірка, чи передано правильний код тривалості
      if (!['1d', '3d', '1w', '1m', '3m'].includes(durationCode)) {
         await bot.sendMessage(chatId, 'Неправильний код тривалості. Використовуйте: 1d, 3d, 1w, 1m, 3m');
         return;
      }

      const code = generateRandomCode(); // Генерація унікального коду
      const uniqueCode = new UniqueCodeModel({ code, subscriptionDuration: durationCode });
      await uniqueCode.save();

      await bot.sendMessage(chatId, `Ваш унікальний код (${durationCode}), використання /code [код]`);
      await bot.sendMessage(chatId, `${code}`);
   } catch (error) {
      console.error('Помилка при генерації унікального коду:', error);
      await bot.sendMessage(chatId, 'Помилка при генерації унікального коду');
   }
}


// Генератор випадкового коду
function generateRandomCode() {
   const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
   let code = '';
   for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
         code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      code += '-';
   }
   return code.slice(0, -1); // Видаляємо останнє тире
}

async function deleteUniqueCode(chatId, code) {
   try {
      const deletedCode = await UniqueCodeModel.findOneAndDelete({ code });

      if (deletedCode) {
         await bot.sendMessage(chatId, `Унікальний код ${code} успішно видалено`);
      } else {
         await bot.sendMessage(chatId, `Унікальний код ${code} не знайдено`);
      }
   } catch (error) {
      console.error('Помилка при видаленні унікального коду:', error);
      await bot.sendMessage(chatId, 'Помилка при видаленні унікального коду');
   }
}

async function createNewAd(chatId, option, userId, text) {
   try {
      // Отримуємо дані продавця
      const seller = await SellerModel.findOne({ telegramId: userId });

      // Перевірка ліміту оголошень
      if (seller.numberOfAnnouncements < seller.maxAnnouncements) {
         const newAnnouncement = new AnnouncementModel({
            sellerId: userId,
            option: option,
            properties: {
               text: text,
            },
            isPendingModeration: true,
            isApproved: false,
            isActive: false,
         });

         // Збільшуємо лічильник оголошень
         seller.numberOfAnnouncements += 1;
         await seller.save();

         await newAnnouncement.save();
         await bot.sendMessage(chatId, 'Оголошення відправлено на модерацію.');
      } else {
         // Повідомлення про досягнення ліміту оголошень
         await bot.sendMessage(chatId, 'Ви досягли ліміту оголошень.');
      }
   } catch (error) {
      console.error('Помилка при створенні оголошення:', error);
      await bot.sendMessage(chatId, 'Помилка при створенні оголошення.');
   }
}

async function authenticateSeller(chatId, code, userId, nickname) {
   try {
      const uniqueCode = await UniqueCodeModel.findOne({ code });

      if (uniqueCode) {
         const subscriptionDuration = uniqueCode.subscriptionDuration;

         // Останній код не враховується, бо потрібно оновити підписку для нового коду
         const existingSeller = await SellerModel.findOne({ telegramId: userId });

         if (existingSeller) {
            await UniqueCodeModel.findOneAndDelete({ code });

            // Оновлення: Оновлення підписки для існуючого продавця
            if (existingSeller.subscription.isActive) {

               // Оновлення: Додавання часу з коду до залишеного часу підписки
               const newExpirationTime = new Date(existingSeller.subscription.expiresAt.getTime()); // Копіюємо час закінчення підписки

               switch (subscriptionDuration) {
                  case '1d':
                     newExpirationTime.setDate(newExpirationTime.getDate() + 1);
                     break;
                  case '3d':
                     newExpirationTime.setDate(newExpirationTime.getDate() + 3);
                     break;
                  case '1w':
                     newExpirationTime.setDate(newExpirationTime.getDate() + 7);
                     break;
                  case '1m':
                     newExpirationTime.setMonth(newExpirationTime.getMonth() + 1);
                     break;
                  case '3m':
                     newExpirationTime.setMonth(newExpirationTime.getMonth() + 3);
                     break;
                  default:
                     break;
               }

               existingSeller.subscription.expiresAt = newExpirationTime;
            }
            else {
               // Оновлення: Встановлення нового терміну підписки, якщо підписка не активна
               existingSeller.subscription.expiresAt = calculateExpirationTime(subscriptionDuration);
               existingSeller.subscription.isActive = true;
            }

            await existingSeller.save();

            console.log(`Продавець Telegram ID ${userId} відновлений`);
            const expirationDate = existingSeller.subscription.expiresAt.toLocaleDateString('uk-UA', { timeZone: 'UTC' });
            await bot.sendMessage(chatId, `✅Welcome back to the family. Підписка оновлена на ${subscriptionDuration}. Ваша підписка дійсна до ${expirationDate}`);
         } else {
            // Оновлення: Створення нового продавця з підпискою
            const expiresAt = calculateExpirationTime(subscriptionDuration);
            const newSeller = new SellerModel({ telegramId: userId, name: nickname, subscription: { expiresAt, isActive: true } });
            await newSeller.save();

            await UniqueCodeModel.findOneAndDelete({ code });

            console.log(`Продавець Telegram ID ${userId} створений`);
            const expirationDate = expiresAt.toLocaleDateString('uk-UA', { timeZone: 'UTC' });
            await bot.sendMessage(chatId, `✅Вас успішно зареєстровано як продавця з підпискою на ${subscriptionDuration}. Ваша підписка дійсна до ${expirationDate}`);
         }
      } else {
         await bot.sendMessage(chatId, '❌Неправильний унікальний код. Спробуйте ще раз');
      }
   } catch (error) {
      console.error('Помилка при аутентифікації продавця:', error);
      await bot.sendMessage(chatId, 'Помилка при аутентифікації продавця');
   }
}


// Оновлення: Функція для розрахунку дати закінчення підписки
function calculateExpirationTime(durationCode) {
   const currentDate = new Date();

   switch (durationCode) {
      case '1d':
         currentDate.setDate(currentDate.getDate() + 1);
         break;
      case '3d':
         currentDate.setDate(currentDate.getDate() + 3);
         break;
      case '1w':
         currentDate.setDate(currentDate.getDate() + 7);
         break;
      case '1m':
         currentDate.setMonth(currentDate.getMonth() + 1);
         break;
      case '3m':
         currentDate.setMonth(currentDate.getMonth() + 3);
         break;
      default:
         break;
   }

   return currentDate;
}

async function updateAnnouncementStatuses() {
   try {
      const currentDate = new Date();

      // Отримайте всі активні оголошення
      const allAnnouncements = await AnnouncementModel.find({
         isActive: true,
      });

      // Отримайте всіх продавців, у яких підписка неактивна
      const inactiveSellers = await SellerModel.find({
         'subscription.isActive': false,
         'subscription.expiresAt': { $lt: currentDate },
      });

      // Оновіть статуси оголошень для кожного продавця з неактивною підпискою
      for (const seller of inactiveSellers) {
         const sellerId = seller.telegramId;

         // Знайдіть усі активні оголошення продавця за його sellerId
         const sellerAnnouncements = allAnnouncements.filter(
            (announcement) => announcement.sellerId === sellerId
         );

         // Оновіть статуси кожного оголошення для цього продавця
         for (const announcement of sellerAnnouncements) {
            announcement.isActive = false;
            await announcement.save();
         }
      }

      console.log('Оновлено статуси оголошень');

   } catch (error) {
      console.error('Помилка при оновленні статусів оголошень:', error);
   }
}

async function updateSubscriptionStatuses() {
   try {
      const currentDate = new Date();

      // Отримайте всіх продавців, у яких підписка активна
      const activeSellers = await SellerModel.find({
         'subscription.isActive': true,
         'subscription.expiresAt': { $lt: currentDate },
      });

      // Оновіть статуси підписок для кожного продавця
      for (const seller of activeSellers) {
         seller.subscription.isActive = false;
         await seller.save();
      }

      console.log('Оновлено статуси підписок');

   } catch (error) {
      console.error('Помилка при оновленні статусів підписок:', error);
   }
}

async function getSubscriptionStatus(userId, chatId) {
   try {
      const existingSeller = await SellerModel.findOne({ telegramId: userId });

      if (existingSeller) {
         const currentTime = new Date();
         const expirationDate = existingSeller.subscription.expiresAt;

         const keyboard = {
            reply_markup: {
               inline_keyboard: [
                  [{ text: '👨‍💻Головне меню', callback_data: 'main_menu' }],
               ],
            },
         };

         if (existingSeller.subscription.isActive && expirationDate > currentTime) {
            // Підписка активна
            const formattedExpirationDate = expirationDate.toLocaleDateString('uk-UA', { timeZone: 'UTC' });

            const message = `ℹ️Ваша підписка активна до ${formattedExpirationDate}`;
            await bot.sendMessage(chatId, message, keyboard);

            return {
               isActive: true,
               expirationDate: formattedExpirationDate,
            };
         } else {
            // Підписка неактивна
            const message = 'ℹ️Ваша підписка неактивна';
            await bot.sendMessage(chatId, message, keyboard);

            return {
               isActive: false,
            };
         }
      } else {
         // Продавець не знайдений
         const message = 'ℹ️Продавець не знайдений';
         await bot.sendMessage(chatId, message, keyboard);

         return {
            error: message,
         };
      }
   } catch (error) {
      console.error('Помилка при перевірці статусу підписки:', error);
      const message = 'Помилка при перевірці статусу підписки';
      await bot.sendMessage(chatId, message);

      return {
         error: message,
      };
   }
}

const isSeller = async (telegramId) => {
   try {
      const seller = await SellerModel.findOne({ telegramId });
      return !!seller; // Повертає true, якщо продавець з таким telegramId знайдений
   } catch (error) {
      console.error('Помилка при перевірці продавця в базі даних:', error);
      return false;
   }
};

async function isUserSubscriptionActive(userId) {
   try {
      const seller = await SellerModel.findOne({ telegramId: userId });
      return seller && seller.subscription && seller.subscription.isActive;
   } catch (error) {
      console.error('Помилка при перевірці активності підписки:', error);
      return false; // повернення за замовчуванням у разі помилки
   }
};

const isUserExist = async (userId) => {
   try {
      const user = await UserModel.findOne({ userId });
      return !!user; // Повертає true, якщо користувач з таким telegramId знайдений
   } catch (error) {
      console.error('Помилка при перевірці користувача в базі даних:', error);
      return false;
   }
};

const getUserInfoById = async (userId) => {
   try {
      const user = await UserModel.findOne({ userId });
      return user;
   } catch (error) {
      console.error('Помилка при отриманні інформації про користувача з бази даних:', error);
      return null;
   }
};

const sendBroadcastMessage = async (bot, messageText) => {
   try {
      const users = await UserModel.find({});

      for (const user of users) {
         const userId = user.userId;
         await bot.sendMessage(userId, messageText);
      }

      console.log('Розсилка повідомлення завершена.');
   } catch (error) {
      console.error('Помилка при розсилці повідомлення:', error);
   }
};

const sendBroadcastToSubscribedSellers = async (bot, messageText) => {
   try {
      const subscribedSellers = await SellerModel.find({ 'subscription.isActive': true });

      for (const seller of subscribedSellers) {
         const telegramId = seller.telegramId;
         await bot.sendMessage(telegramId, messageText);
      }
   } catch (error) {
      console.error('Помилка при розсилці повідомлення продавцям:', error);
   }
};



// -------------------------------MAIN CODE---------------------------------------------------------------------
const { AnnouncementOptions, CourseOptions, SellerOptions, getAnnouncementOptions, InstituteOptions_1, InstituteOptions_2 } = require('./options');
const { callbacks, userSteps, getCourseNumber, mainMenuText, mainMenuKeyboard } = require('./callbacks');

const fs = require('fs');
const path = require('path');

const start = async () => {

   const userLastMessageTime = {}; // об'єкт для відстеження часу останнього повідомлення для кожного користувача
   const messageLimitInterval = 1000; // інтервал в мілісекундах, наприклад, 10 секунд

   bot.setMyCommands([  //--------------------------------------------- Інформація про команди
      // { command: '/info', description: 'Test info' },
      // { command: '/checkstatus', description: 'Статус підписки' },
      { command: '/menu', description: 'Головне меню' },
      { command: '/find', description: 'Знайти роботу' },
      { command: '/seller', description: 'Меню продавця' },
      { command: '/changecourse', description: 'Вибрати курс' },
   ]);

   bot.on('message', async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const nickname = msg.from.first_name + (msg.from.last_name ? ' ' + msg.from.last_name : '');
      const username = msg.from.username;

      const currentTime = Date.now();
      const lastMessageTime = userLastMessageTime[userId] || 0;

      const adminUsersId = 891948666;
      const moderatorUsersId = 743865377;

      // function updateAll() {
      //    const currentDate = new Date();
      //    updateSubscriptionStatuses();
      //    setTimeout(updateAnnouncementStatuses, 1000);
      //    console.log(`Автоматичне оновлення статусів: ${currentDate}`);
      // }

      // setInterval(updateAll, 30000);

      if (currentTime - lastMessageTime < messageLimitInterval) {
         await bot.sendMessage(chatId, '？Шановний, куда так спішиш?');
         return;
      }

      const text = msg.text;

      try {
         switch (text) {
            case '/start':
               // Перевірка, чи користувач існує в базі
               const userExist = await isUserExist(userId);

               if (!userExist) {
                  // Якщо користувача не існує, реєструємо його
                  const newUser = new UserModel({
                     userId,
                     username,
                     nickname,
                  });

                  await newUser.save();
                  console.log(`Користувач Telegram ID ${userId} зареєстрований`);

                  const keyboard = {
                     reply_markup: {
                        inline_keyboard: [
                           [{ text: 'Курс 1', callback_data: 'course_11' }, { text: 'Курс 2', callback_data: 'course_22' }, { text: 'Курс 3', callback_data: 'course_33' }]
                        ],
                     },
                  };

                  await bot.sendMessage(chatId, '📖Виберіть ваш курс', keyboard);
               } else {
                  bot.sendMessage(chatId, mainMenuText, mainMenuKeyboard);
               }
               break;

            case '/menu':
               try {
                  let userStepsData = await UserStepsModel.findOne({ chatId });
                  if (!userStepsData) {
                     userStepsData = new UserStepsModel({ chatId, steps: [] });
                  }
                  userStepsData.steps = ['main_menu'];
                  await userStepsData.save();

                  // console.log(userStepsData.steps);

                  bot.sendMessage(chatId, mainMenuText, mainMenuKeyboard);
               } catch (error) {
                  console.error('Помилка при обробці команди /menu:', error);
                  bot.sendMessage(chatId, 'Помилка при обробці команди /menu.');
               }
               break;

            case '/find':
               try {
                  const courseNumber = await getCourseNumber(userId);
                  let userStepsData = await UserStepsModel.findOne({ chatId });

                  if (!userStepsData) {
                     // Створюємо новий об'єкт userStepsData, якщо він не існує
                     userStepsData = new UserStepsModel({ chatId, steps: [] });
                  }

                  userStepsData.steps = ['main_menu', 'find_menu'];
                  await userStepsData.save();

                  switch (courseNumber) {
                     case 1:
                        bot.sendMessage(chatId, '🏫Виберіть інститут', InstituteOptions_1);
                        break;
                     case 2:
                        bot.sendMessage(chatId, '🏫Виберіть інститут', InstituteOptions_2);
                        break;
                     case 3:
                        bot.sendMessage(chatId, '🏫Виберіть інститут', InstituteOptions_3);
                        break;
                  }
               } catch (error) {
                  console.error('Помилка при обробці команди /find:', error);
                  bot.sendMessage(chatId, 'Помилка при обробці команди /find.');
               }
               break;

            case '/seller':
               const isSellerUser = await isSeller(userId);

               let userStepsData = await UserStepsModel.findOne({ chatId });

               if (!userStepsData) {
                  // Створюємо новий об'єкт userStepsData, якщо він не існує
                  userStepsData = new UserStepsModel({ chatId, steps: [] });
               }

               // Оновлюємо властивість steps, якщо об'єкт userStepsData існує
               userStepsData.steps = ['seller_menu'];
               await userStepsData.save();

               if (isSellerUser) {
                  bot.sendMessage(chatId, 'Меню продавця:', SellerOptions);
               } else {
                  bot.sendMessage(chatId, 'Ви не зареєстровані як продавець. Зареєструйтесь, - @nulpsupport щоб отримати доступ до цього меню');
               }
               break;


            case '/updateall':
               if (userId == adminUsersId || userId == moderatorUsersId) {
                  const currentDate = new Date();
                  const formattedDate = `${currentDate.getDate()}.${currentDate.getMonth() + 1}.${currentDate.getFullYear()} ${currentDate.getHours()}:${currentDate.getMinutes()}:${currentDate.getSeconds()}`;
                  updateSubscriptionStatuses();
                  setTimeout(updateAnnouncementStatuses, 1000);
                  bot.sendMessage(chatId, '_✅Статуси оновлено_', { parse_mode: 'Markdown' });
                  console.log(`Оновлення статусів: ${formattedDate}`);
               }
               break;

            case '/checkstatus':
               getSubscriptionStatus(userId, chatId);
               break;

            case '/countusers':
               if (userId == adminUsersId) {
                  try {
                     // Отримання загальної кількості користувачів в базі
                     const usersCount = await UserModel.countDocuments({});
                     bot.sendMessage(chatId, `Загальна кількість користувачів: ${usersCount}`);
                  } catch (error) {
                     console.error('Помилка при отриманні кількості користувачів з бази даних:', error);
                     bot.sendMessage(chatId, 'Помилка при отриманні інформації про користувачів.');
                  }
               }
               break;

            default:
               if (text.startsWith('/generateuniquecode') && userId == adminUsersId) {
                  const durationCode = text.split(' ')[1];
                  generateUniqueCode(chatId, durationCode);
               }

               else if (text.startsWith('/changecourse')) {
                  try {
                     // Виведіть кнопки для вибору курсу
                     const keyboard = {
                        reply_markup: {
                           inline_keyboard: [
                              [{ text: 'Курс 1', callback_data: 'course_1' }, { text: 'Курс 2', callback_data: 'course_2' }, { text: 'Курс 3', callback_data: 'course_3' }]
                           ],
                        },
                     };

                     await bot.sendMessage(chatId, '🔄Виберіть новий курс:', keyboard);
                  } catch (error) {
                     console.error('Помилка при відправці команди /changecourse:', error);
                     await bot.sendMessage(chatId, 'Помилка при обробці команди /changecourse.');
                  }
               }

               else if (text.startsWith('/deleteuniquecode') && userId == adminUsersId) {
                  const codeToDelete = text.split(' ')[1];
                  if (codeToDelete) {
                     deleteUniqueCode(chatId, codeToDelete);
                  } else {
                     bot.sendMessage(chatId, 'Введіть команду у форматі /deleteuniquecode <код>');
                  }
               }

               else if (text.startsWith('/bc') && userId == adminUsersId) {
                  const textToBroadcast = text.slice('/bc'.length).trim();
                  if (textToBroadcast) {
                     bot.sendMessage(chatId, 'Надіслано');
                     sendBroadcastMessage(bot, textToBroadcast);
                  } else {
                     bot.sendMessage(chatId, 'Введіть команду у форматі /bc <message>');
                  }
               }


               else if (text.startsWith('/bdseller') && userId == adminUsersId) {
                  const textToBroadcast = text.slice('/bdseller'.length).trim();
                  if (textToBroadcast) {
                     bot.sendMessage(chatId, 'Надіслано');
                     sendBroadcastToSubscribedSellers(bot, textToBroadcast);
                  } else {
                     bot.sendMessage(chatId, 'Введіть команду у форматі /bcseller <message>');
                  }
               }

               else if (text.startsWith('/code')) {
                  const code = text.split(' ')[1];
                  if (code) {
                     authenticateSeller(chatId, code, userId, nickname);
                  } else {
                     bot.sendMessage(chatId, 'Введіть правильний унікальний код');
                  }
               }

               else if (text.startsWith('/createAd')) {
                  const maxAdTextLength = 700;

                  if (text.length < maxAdTextLength) {
                     const [, option, ...textArray] = text.split(' ');
                     const adText = textArray.join(' ');

                     // Перевірка активності підписки
                     const isSubscriptionActive = await isUserSubscriptionActive(userId);

                     if (isSubscriptionActive) {
                        if (option && adText) {
                           createNewAd(chatId, option, userId, adText);
                        } else {
                           bot.sendMessage(chatId, 'Неправильний формат команди. Введіть /createAd option text');
                        }
                     } else {
                        bot.sendMessage(chatId, 'Для створення оголошень вам потрібна активна підписка. Зверніться до адміністратора.');
                     }
                  } else {
                     await bot.sendMessage(chatId, `Перевищено максимальну кількість символів для оголошення. Максимально допустима кількість символів: ${maxAdTextLength}`);
                     return;
                  }
               }

               else if (text.startsWith('/moderate')) {
                  if (userId == adminUsersId || userId == moderatorUsersId) {
                     try {
                        const pendingAnnouncements = await AnnouncementModel.find({ isPendingModeration: true });

                        if (pendingAnnouncements.length > 0) {
                           pendingAnnouncements.forEach(async (announcement) => {
                              const userInfo = await getUserInfoById(announcement.sellerId);
                              const messageText = `Оголошення від ${userInfo ? userInfo.username : 'Невідомий користувач'} для модерації:\n\n${announcement.properties.text}\n\nОпція: ${announcement.option}`;

                              // Опції для підтвердження або відхилення
                              const options = {
                                 reply_markup: JSON.stringify({
                                    inline_keyboard: [
                                       [{ text: 'Підтвердити', callback_data: `approve_${announcement._id}` }],
                                       [{ text: 'Відхилити', callback_data: `reject_${announcement._id}` }],
                                    ],
                                 }),
                              };

                              await bot.sendMessage(userId, messageText, options);
                           });
                        } else {
                           bot.sendMessage(userId, 'Немає оголошень для модерації.');
                        }
                     } catch (error) {
                        console.error('Помилка при отриманні оголошень для модерації:', error);
                        bot.sendMessage(userId, 'Помилка при отриманні оголошень для модерації.');
                     }
                  }
               }

               // Умова за замовчуванням, яка обробляє нерозпізнані команди
               else {
                  bot.sendMessage(chatId, 'Я вас не розумію');
               }
               break;
         }

      } catch (e) {
         console.error('Помилка', e);
         return bot.sendMessage(chatId, 'Помилка бота');
      } finally {
         // Оновлюємо час останнього повідомлення для користувача
         userLastMessageTime[userId] = currentTime;
      }

   });

   async function handleCallback(chatId, data) {
      try {
         let userStepsData = await UserStepsModel.findOne({ chatId });
         if (!userStepsData) {
            userStepsData = new UserStepsModel({ chatId, steps: [] });
         }

         if (callbacks[data]) {
            // Викликаємо відповідний обробник, якщо він існує
            if (userStepsData.steps.length >= 8) {
               userStepsData.steps.shift();
            }

            if (data !== 'back') {
               await userStepsData.steps.push(data);
            }

            // Отримуємо інформацію з колбека
            const messageInfo = await callbacks[data](chatId);

            // Перевіряємо, чи в колбеку є folderPath
            if (messageInfo.folderPath) {
               await bot.sendMessage(chatId, '📥Завантаження файлів...');
               await sendFiles(chatId, messageInfo.folderPath);
            }

            // Отримуємо окремі оголошення
            const announcements = messageInfo.text.split('\n\n');

            // Отримуємо кількість оголошень
            const totalAnnouncements = announcements.length;

            // Відправляємо кожне оголошення окремим повідомленням
            for (let i = 0; i < totalAnnouncements; i++) {
               // Отримуємо оголошення
               const announcement = announcements[i];

               // Встановлюємо параметри повідомлення
               let options = {};

               // Якщо це останнє оголошення, встановлюємо параметри повідомлення з messageInfo.options
               if (i === totalAnnouncements - 1) {
                  options = { ...messageInfo.options };
               }

               // Відправляємо повідомлення з поточними параметрами
               await bot.sendMessage(chatId, announcement, options);
            }

            // Зберігаємо зміни в базі даних
            await userStepsData.save();
         }
      } catch (error) {
         console.error('Помилка при обробці колбека:', error);
         await bot.sendMessage(chatId, 'Помилка при обробці колбека.');
      }
   }

   function chunkString(str, length) {
      const regex = new RegExp(`.{1,${length}}`, 'g');
      return str.match(regex) || [];
   }



   bot.on('callback_query', async msg => {
      const data = msg.data;
      const chatId = msg.message.chat.id;
      const userId = msg.from.id;
      const messageId = msg.message.message_id;

      try {
         // Видаляємо попереднє повідомлення, якщо воно існує
         if (messageId) {
            await bot.deleteMessage(chatId, messageId);
         }
      } catch (error) {
         console.error('Помилка при видаленні попереднього повідомлення:', error);
      }

      if (data.startsWith('course_')) {
         // Отримайте номер курсу з колбеку
         const newCourse = parseInt(data.split('_')[1]);

         if (newCourse == 11 || newCourse == 22 || newCourse == 33) {
            if (newCourse == 11) {
               await UserModel.findOneAndUpdate({ userId }, { course: 1 });
            } else if (newCourse == 22) {
               await UserModel.findOneAndUpdate({ userId }, { course: 2 });
            } else if (newCourse == 33) {
               await UserModel.findOneAndUpdate({ userId }, { course: 3 });
            }
            await bot.sendMessage(chatId, mainMenuText, mainMenuKeyboard);

         } else {

            await UserModel.findOneAndUpdate({ userId }, { course: newCourse });
            await bot.sendMessage(chatId, `✅Курс оновлено на ${newCourse}`);
            setTimeout(async () => {
               await bot.sendMessage(chatId, mainMenuText, mainMenuKeyboard);
            }, 500);
         }
      }

      if (data.startsWith('approve_') || data.startsWith('reject_')) {
         const announcementId = data.split('_')[1];

         try {
            const announcement = await AnnouncementModel.findOne({ _id: announcementId, isPendingModeration: true });

            if (announcement) {
               const userId = announcement.sellerId;
               if (data.startsWith('approve_')) {
                  // Підтвердження оголошення
                  await AnnouncementModel.findByIdAndUpdate(announcementId, { isPendingModeration: false, isApproved: true, isActive: true });
                  await bot.sendMessage(chatId, 'Оголошення схвалено.');
               } else {
                  // Відхилення оголошення
                  const seller = await SellerModel.findOne({ telegramId: userId });
                  seller.numberOfAnnouncements -= 1;
                  await AnnouncementModel.findByIdAndDelete(announcementId);
                  await seller.save();

                  await bot.sendMessage(chatId, 'Оголошення відхилено.');
               }

               const message = data.startsWith('approve_') ? '✅Оголошення схвалено.' : '❌Оголошення відхилено.';

               await bot.sendMessage(userId, `Ваше оголошення:\n${announcement.properties.text}\n\n${message}`);
            } else {
               await bot.sendMessage(chatId, 'Оголошення для модерації не знайдено.');
            }
         } catch (error) {
            console.error('Помилка при модерації оголошення:', error);
            await bot.sendMessage(chatId, 'Помилка при модерації оголошення.');
         }
      }

      // Обробка кнопки
      if (data === 'back') {
         try {
            const userStepsData = await UserStepsModel.findOne({ chatId });
            if (userStepsData && userStepsData.steps.length > 0) {
               userStepsData.steps.pop(); // Видаляємо останній елемент
               const lastStep = userStepsData.steps[userStepsData.steps.length - 1];
               if (callbacks[lastStep]) {
                  // Відправляємо останнє повідомлення для кнопки "Назад"
                  const messageInfo = await callbacks[lastStep](chatId);
                  await bot.sendMessage(chatId, messageInfo.text, messageInfo.options);

                  // console.log(userStepsData.steps);
               }
               await userStepsData.save(); // Зберігаємо зміни у базі даних
            } else {
               await bot.sendMessage(chatId, 'Помилка, відкрийте меню - /menu');
            }
         } catch (error) {
            console.error('Помилка при обробці кнопки "Назад":', error);
            await bot.sendMessage(chatId, 'Помилка при обробці кнопки "Назад".');
         }
         return;
      } else if (data === 'my_announcement') {

         const keyboard = {
            reply_markup: {
               inline_keyboard: [
                  [{ text: '👨‍💻Головне меню', callback_data: 'main_menu' }],
               ],
            },
         };
         const announcementOptions = await getAnnouncementOptions(userId);
         const text = await getUserAnnouncements(userId);
         await bot.sendMessage(chatId, text, keyboard, announcementOptions);
         return;
      } else if (data === 'subscription_status') {
         getSubscriptionStatus(userId, chatId);
      } else {
         // Викликаємо обробку колбека (крім кнопки "Назад")
         await handleCallback(chatId, data);
      }
   });

}
start();

// -------------------------------CALLBACKS---------------------------------------------------------------------

const getUserAnnouncements = async (userId) => {
   try {
      const userAnnouncements = await AnnouncementModel.find({ sellerId: userId });

      if (userAnnouncements.length > 0) {
         let result = ``;
         userAnnouncements.forEach((announcement, index) => {
            const status = announcement.isActive ? 'активно✅' : 'неактивно❌';
            result += `Оголошення #${index + 1} (${status})\n-------------------------------------\n`;
            result += `${announcement.properties.text}\n`;
            result += '-------------------------------------\n\n';
         });

         return result;
      } else {
         return 'Ви не маєте оголошень';
      }
   } catch (error) {
      console.error('Помилка при отриманні оголошень з бази даних:', error);
      return 'Помилка при отриманні оголошень.';
   }
};

// Функція для надсилання файлів, прикріплених до повідомлення
const sendFiles = async (chatId, folderPath) => {
   try {
      const files = fs.readdirSync(folderPath);
      for (const file of files) {
         const filePath = path.join(folderPath, file);
         await bot.sendDocument(chatId, filePath);
      }
   } catch (error) {
      console.error('Помилка при надсиланні файлів:', error);
   }
}

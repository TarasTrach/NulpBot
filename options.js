const { AnnouncementModel } = require('./models/models.js');

const getAnnouncementOptions = async (userId) => {
   try {
      const userAnnouncements = await AnnouncementModel.find({ sellerId: userId });

      if (userAnnouncements.length === 0) {
         return; // Якщо у користувача немає оголошень, повертаємо за замовчуванням
      }

      return;
   } catch (error) {
      console.error('Помилка при отриманні оголошень з бази даних:', error);
      return; // повернення за замовчуванням у разі помилки
   }
};


module.exports = {
   getAnnouncementOptions,

   SellerOptions: {
      reply_markup: JSON.stringify({
         inline_keyboard: [
            [{ text: 'Мої оголошення', callback_data: 'my_announcement' }, { text: 'Статус підписки', callback_data: 'subscription_status' },],
            [{ text: '🔙Назад', callback_data: 'main_menu' }],
         ]
      })
   },

   AnnouncementOptions: {
      reply_markup: JSON.stringify({
         inline_keyboard: [
            [{ text: 'Оголошення 1', callback_data: 'announcement_0' }],
            [{ text: 'Оголошення 2', callback_data: 'announcement_1' }],
            [{ text: 'Оголошення 3', callback_data: 'announcement_2' }],
         ]
      })
   },

   BackOption: {
      reply_markup: JSON.stringify({
         inline_keyboard: [
            [{ text: '🔙Назад', callback_data: 'back' }],
         ]
      })
   },

   // ------------------------------------------- NAVIGATION --------------------------------------------------------------------

   InstituteOptions_1: {
      reply_markup: JSON.stringify({
         inline_keyboard: [
            [{ text: 'IKTA', callback_data: 'IKTA_1' }],
            [{ text: '🔙Назад', callback_data: 'back' }],
         ]
      })
   },

   InstituteOptions_2: {
      reply_markup: JSON.stringify({
         inline_keyboard: [
            [{ text: 'IKTA', callback_data: 'IKTA_2' }],
            [{ text: '🔙Назад', callback_data: 'back' }],
         ]
      })
   },

   InstituteOptions_3: {
      reply_markup: JSON.stringify({
         inline_keyboard: [
            [{ text: 'IKTA', callback_data: 'IKTA_3' }],
            [{ text: '🔙Назад', callback_data: 'back' }],
         ]
      })
   },

   IKTA_1_Speciality: {
      reply_markup: JSON.stringify({
         inline_keyboard: [
            [{ text: 'Комп. інженерія', callback_data: 'KI_1' }, { text: 'Кібербезпека', callback_data: 'KB_1' }],
            [{ text: '🔙Назад', callback_data: 'back' }],
         ]
      }),
   },

   IKTA_2_Speciality: {
      reply_markup: JSON.stringify({
         inline_keyboard: [
            [{ text: 'Комп`ютерна інженерія', callback_data: 'KI_2' }, { text: 'Кібербезпека', callback_data: 'KB_2' }],
            [{ text: '🔙Назад', callback_data: 'back' }],
         ]
      }),
   },

   KI_1_Options: {
      reply_markup: JSON.stringify({
         inline_keyboard: [
            [{ text: 'Вишмат', callback_data: 'KI_1_1' }, { text: 'ООФК', callback_data: 'KI_1_2' }, { text: 'Фізика', callback_data: 'KI_1_3' }],
            [{ text: '🔙Назад', callback_data: 'back' }],
         ]
      })
   },
   KI_2_Options: {
      reply_markup: JSON.stringify({
         inline_keyboard: [
            [{ text: 'Комп`ютерна електроніка', callback_data: 'KI_2_1' }, { text: 'Комп`ютерна логіка', callback_data: 'KI_2_2' }],
            [{ text: '🔙Назад', callback_data: 'back' }],
         ]
      })
   },
   KI_3_Options: {
      reply_markup: JSON.stringify({
         inline_keyboard: [
            [{}],
         ]
      })
   },
}
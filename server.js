const token = ""
const TelegramBot = require("node-telegram-bot-api")
const bot = new TelegramBot(token, {polling: true});
const {readFile} = require("fs");
const {writeFile} = require("fs");

const keyboard = [
  [
    {
      text: 'Внести данные',
      callback_data: 'enterData'
    }
  ],
  [
    {
      text: 'Статистика',
      callback_data: 'stats'
    }
  ]
];
const monthes = {
  0: "Январь",
  1: "Февраль",
  2: "Март",
  3: "Апрель",
  4: "Май",
  5: "Июнь",
  6: "Июль",
  7: "Август",
  8: "Сентябрь",
  9: "Октябрь",
  10: "Ноябрь",
  11: "Декабрь"
};
const ids = {
  "LinerMVVM": 0,
  "OlgaKoroleva19": 1
};
let checker = false;

function getMonth() {
  let date = new Date().getMonth();
  return monthes[date]
}
function searcher(name, accomodations) {
  for (let id in ids) {
    if (name == id) {
      let index = ids[name];
      return accomodations[index]
    }
  }
}
function checkParticipation(name) {
    for (let id in ids) {
      if (name == id) {
        return "participant"
      }
    }
    return "notParticipant"
}
function parseResult(data) {
  if (!data) {
    return
  }
  let month = Object.keys(data);
  let result = ``;
  for (let i = 1; i < month.length; i++) {
    result += `За ${month[i]} - ${data[month[i]] - data[month[i-1]]} кубов
`
  }
  result += `
Общие показания счётчика за все месяцы:
`
  for (let date in month) {
    result += `${month[date]} - ${data[month[date]]} кубов
`
  }
  return `Расходы по месяцам:
${result}
`
}
function enterData(msg, id, accomodations) {
  if (typeof +msg.text != "number") {
    return
  }
  let name = ids[id];
  let mon = Object.keys(accomodations[name]);
  let month = getMonth();
  accomodations[name][month] = msg.text;
  writeFile("text.txt", JSON.stringify(accomodations), error => {
    if (error) {
      bot.sendMessage(msg.chat.id, "Что-то пошло не так, ваши данные не записались. Напишите в поддержку.")
    }
    return
})
}
function JSONToCSVConvertor(JSONData, ShowLabel, user) {
    let arrData = typeof JSONData != 'object' ? JSON.parse(JSONData) : JSONData;
    let CSV = "";
    if (ShowLabel) {
        let row = "";
        for (let index in arrData[0]) {
            row += index + ',';
        }
        row = row.slice(0, -1);
        CSV += row + '\r\n';
    }

    for (let i = 0; i < arrData.length; i++) {
        let row = "";
        for (let index in arrData[i]) {
            row += '"' + arrData[i][index] + '",';
        }
        row.slice(0, row.length - 1);
        CSV += row + '\r\n';
    }
    if (CSV == '') {
        console.log("Invalid data");
        bot.sendMessage(user, "Ошибка в конвертации JSON в CSV.")
        return;
    }
    writeFile("data.csv", CSV, error => {
      if (error) {
        console.log(error);
        bot.sendMessage(user, "Ошибка в отправке файла.")
        return;
      }
      bot.sendDocument(user, "data.csv")
    })
    bot.sendMessage(user, "Вот файл, ыы")
}

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  console.log(msg);
 if (checkParticipation(msg.chat.username) == "notParticipant") {
   bot.sendMessage(chatId, "Вы не в базе участников.")
   return
  }
 if (msg.text == "/start") {
   bot.sendMessage(chatId, `Привет, ${msg.chat.first_name}. Просто нажмите на нужную кнопку.`, {
      reply_markup: {
          inline_keyboard: keyboard,
      }
  });
}
 if (msg.text.match(/сд/i)) {
  await readFile("text.txt", "utf-8", (error, resp) => {
    if (error) {
      bot.sendMessage(user, "Ошибка, файл не отправлен.")
      return
    }
    let forJSON = [];
    let accomodations = JSON.parse(resp);
    for (let item of accomodations) {
      forJSON.push(item[Object.keys(item)[Object.keys(item).length-1]])
    }
    for (let i = 0; i < forJSON.length; i++) {
      let item = forJSON[i]
      forJSON[i] = {}
      forJSON[i][i] = item
    }
    JSONToCSVConvertor(forJSON, false, chatId)
  })
} else if (isNaN(+msg.text) && checker == true) {
  bot.sendMessage(chatId, "Введите число. Если это дробь, то в качестве разделителя ставьте точку, а не запятую.", {
      reply_markup: {
          inline_keyboard: keyboard
      }
  })
} else if (checker == true) {
    bot.sendMessage(msg.chat.id, "Ваши данные записаны!", {
      reply_markup: {
          inline_keyboard: keyboard
      }
    })
} else {
    bot.sendMessage(chatId, "Я могу только записывать и показывать данные счётчика, так что нажмите на нужную кнопку.", {
        reply_markup: {
            inline_keyboard: keyboard
        }
    })
}
})
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  if (query.data === 'enterData') {

    bot.sendMessage(chatId, `Вы вводите данные за ${getMonth()} месяц. Введите число. Если это дробь, то в качестве разделителя ставьте точку, а не запятую.`)
    checker = true;
    bot.on('message', async (msg) => {
      if (checker != true) {
        return
      }
      if (isNaN(+msg.text)) {
        return
      }
      const username = msg.chat.username;
      await readFile("text.txt", "utf-8", (error, resp) => {
        if (error) {
          bot.sendMessage(msg.chat.id, "Ошибка, не удалось прочитать файл.")
          return
        }
        let accomodations = JSON.parse(resp);
        enterData(msg, username, accomodations)
      })
      checker = false;
  });
  }
  if (query.data === 'stats') {
      await readFile("text.txt", "utf-8", (error, resp) => {
        if (error) {
          bot.sendMessage(msg.chat.id, "Ошибка, не удалось прочитать файл.")
        }
        let accomodations = JSON.parse(resp);
        let result = parseResult(searcher(query.message.chat.username, accomodations))
        bot.sendMessage(chatId, result, {
              reply_markup: {
                  inline_keyboard: keyboard
              }
          })
      })
  }
})

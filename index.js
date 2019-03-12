const fetch = require('node-fetch');
// const encoding = require('encoding');
const utf8 = require('utf8');
const mongoose = require('mongoose');
const History = require('./models/history');


const _PremiumApiBaseURL = 'http://api.worldweatheronline.com/premium/v1/';
const _PremiumApiKey = 'ff851d0d01964063a12153325190703';
const translateKey = 'trnsl.1.1.20190310T114702Z.19d93b4e2d8abf15.2bbd56c893ea8083370b43d4b7841b7869d33a8b';
const translateUrl = 'https://translate.yandex.net/api/v1.5/tr.json/translate';
let query = '';
let cityEng = '';


const db = mongoose.connect(
  'mongodb+srv://elbrus:Qwerty123@cluster0-dqtpq.mongodb.net/test?retryWrites=true',
  {
    useNewUrlParser: true,
  },
);


let answer = '';

async function saveHistory(question, respond, user, searchQuery, city) {
  try {
    const history = new History({
      question,
      answer: respond,
      date: new Date(),
      user,
      searchQuery,
      city,
    });
    await history.save();
  } catch (error) {
    console.log(error.message);
  }
}

async function translateTown(town) {
  try {
    const url = `${translateUrl}?key=${translateKey}&text=${town}&lang=ru-en`;
    const response = await fetch(utf8.encode(url));
    const data = await response.json();
    cityEng = data.text;
    return data.text;
  } catch (err) {
    console.log(err);
    return err;
  }
}

async function translateCountry(country) {
  try {
    const url = `${translateUrl}?key=${translateKey}&text=${country}&lang=en-ru`;
    const response = await fetch(utf8.encode(url));
    const data = await response.json();
    cityEng = data.text;
    return data.text;
  } catch (err) {
    console.log(err);
    return err;
  }
}


async function getTimeZone(input) {
  const url = `${_PremiumApiBaseURL}tz.ashx?q=${input}&format=JSON&key=${_PremiumApiKey}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.data.error) { throw new Error(data.data.error[0].msg); }
    return data.data.time_zone[0].localtime;
  } catch (err) {
    console.log(err);
    return err;
  }
}

async function getTimeOfDay(input) {
  const url = `${_PremiumApiBaseURL}weather.ashx?q=${input}&format=JSON&extra=isDayTime&num_of_days=1&date=&fx=&tp=&cc=&includelocation=&show_comments=&key=${_PremiumApiKey}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.data.error) { throw new Error(data.data.error[0].msg); }
    let timeOfDay = '';
    switch (data.data.current_condition[0].isdaytime) {
      case 'yes':
        timeOfDay = 'День';
        break;
      case 'no':
        timeOfDay = 'Ночь';
        break;
      default:
        timeOfDay = 'Не удалось определить';
        break;
    }
    const sunrise = data.data.weather[0].astronomy[0].sunrise.split(' ')[0];
    let sunset = data.data.weather[0].astronomy[0].sunrise.split(' ')[0].split(':');
    sunset = `${+sunset[0] + 12}:${sunset[1]}`;
    return {
      sunrise,
      sunset,
      timeOfDay,
      city: data.data.request[0].query,
    };
  } catch (err) {
    console.log(err);
    return err;
  }
}

async function dayNight(town) {
  try {
    if (/запусти/i.test(town)) {
      return;
    }
    if (/виктор/i.test(town)) {
      return 'Привет Виктор!!!';
    }
    if ((town) && (town !== 'ping')) {
      let townCapital = town[0].toUpperCase() + town.slice(1);
      let townLower = town.toLowerCase();
      townLower = await translateTown(townLower);
      const localTime = await getTimeZone(townLower);
      const sun = await getTimeOfDay(townLower);
      if ((localTime instanceof Error) || (sun instanceof Error)) {
        throw new Error(localTime.message + sun.message);
      }
      query = sun.city;
      const country = await translateCountry(query.split(',')[1]);
      townCapital = await translateCountry(query.split(',')[0]);
      return `В городе ${townCapital}(${country}) сейчас ${sun.timeOfDay}. Текущее время ${localTime}.
      Восход в ${sun.sunrise}. Закат в ${sun.sunset}.`;
      // return `В ${town}(${sun.city}) сейчас ${sun.timeOfDay}. Текущее время ${localTime}.
      // Восход в ${sun.sunrise}. Закат в ${sun.sunset}.`;
    }
  } catch (err) {
    console.log(err);
    return `К сожалению, я не знаю такого города как ${town}. Попробуйте назвать другой город!`;
  }
}


// async function test() {
//   try {
//     const question = 'Виктор';
//     const apiAnswer = await dayNight(question);
//     answer = apiAnswer;
//     await saveHistory(question, answer, 'testUser', query);
//   } catch (err) {
//     console.log(err);
//     answer = err.message;
//   }
//   console.log(answer);
// }
// test();

const { json } = require('micro');

module.exports = async (req) => {
  const { request, session, version } = await json(req);
  answer = await dayNight(request.original_utterance);
  function exampleTown(array) {
    const index = Math.round(Math.random() * array.length);
    return array[index];
  }
  const towns = ['Москва', 'Ижевск', 'Якутск', 'Лондон'];
  const sampleTown = exampleTown(towns);
  if (request.original_utterance !== 'ping') {
    await saveHistory(request.original_utterance, answer, session.session_id, query, cityEng);
  }
  return {
    version,
    session,
    response: {
      text: answer || `Данный навык является приватным. Давайте узнаем время суток в других городах! Назовите любой город, например ${sampleTown}!`,
      end_session: false,
    },
  };
};

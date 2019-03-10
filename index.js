const fetch = require('node-fetch');

const _PremiumApiBaseURL = 'http://api.worldweatheronline.com/premium/v1/';
const _PremiumApiKey = 'ff851d0d01964063a12153325190703';

let answer = '123';

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
    return {
      sunrise: data.data.weather[0].astronomy[0].sunrise,
      sunset: data.data.weather[0].astronomy[0].sunset,
      timeOfDay,
      city: data.data.request[0].query,
    };
  } catch (err) {
    console.log(err);
    return err;
  }
}

async function dayNight(town) {
  const townLower = town.toLowerCase();
  try {
    if (town) {
      const localTime = await getTimeZone(townLower);
      const sun = await getTimeOfDay(townLower);
      if ((localTime instanceof Error) || (sun instanceof Error)) {
        throw new Error(localTime.message + sun.message);
      }
      return `В ${town} сейчас ${sun.timeOfDay}. Текущее время ${localTime}. 
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
//     const apiAnswer = await dayNight('123');
//     answer = apiAnswer;
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

  return {
    version,
    session,
    response: {
      text: answer || 'Данный навык является приватным. Давайте узнаем время суток в других городах! Назовите любой город, например Якутск!',
      end_session: false,
    },
  };
};

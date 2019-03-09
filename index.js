const fetch = require('node-fetch');

const _PremiumApiBaseURL = 'http://api.worldweatheronline.com/premium/v1/';
const _PremiumApiKey = 'ff851d0d01964063a12153325190703';

let answer = '123';

async function getTimeZone(input) {
  const url = `${_PremiumApiBaseURL}tz.ashx?q=${input}&format=JSON&key=${_PremiumApiKey}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) { throw new Error(response.statusText); }
    return data.data.time_zone[0].localtime;
  } catch (err) {
    console.log(err);
  }
}

async function getTimeOfDay(input) {
  const url = `${_PremiumApiBaseURL}weather.ashx?q=${input}&format=JSON&extra=isDayTime&num_of_days=1&date=&fx=&tp=&cc=&includelocation=&show_comments=&key=${_PremiumApiKey}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
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
    };
  } catch (err) {
    console.log(err);
    answer = err.message;
  }
}

async function dayNight(town) {
  if (town) {
    const localTime = await getTimeZone(town);
    const sun = await getTimeOfDay(town);

    return `В ${town} сейчас ${sun.timeOfDay}. Текущее время ${localTime}. Восход в ${sun.sunrise}. Закат в ${sun.sunset}.`;
  }
}
// async function test() {
//   try {
//     const apiAnswer = await dayNight('yakutsk');
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
      text: answer || 'Давайте узнаем время суток в других городах!',
      end_session: false,
    },
  };
};

function createNotification(title, name, message) {
  chrome.notifications.create(name + '_' + Date.now(), {
    type: 'basic',
    title: title,
    iconUrl: chrome.runtime.getURL('icons/icon128.png'),
    message: message,
    priority: 2
  });
}

var LIMBER_PHRASES = [
  'Take a break!',
  'Watch your spine!',
  'Move around, it\'s free!',
  'Stretch yourself out!',
  'Never, never, never stay sedentary.',
  'Don’t sit. The time will never be just right.',
  'If not now, when?',
  'Everything you can imagine is real.',
  'May you live every day of your life.',
  'A jug fills drop by drop.',
  'All you need is stretch.'
];

function getRandomLimberPhrase() {
  return LIMBER_PHRASES[Math.floor(LIMBER_PHRASES.length * Math.random())];
}

function limberNotification() {
  createNotification('Limber up!', 'LIMBER_REMINDER', getRandomLimberPhrase());
  limberAudio();
}

function limberAudio() {
  var myAudio = new Audio();
  myAudio.src = "media/limber.mp3";
  myAudio.play();
}

function postureAudio() {
  var myAudio = new Audio();
  myAudio.src = "media/posture.mp3";
  myAudio.play();
}

function getAlarms() {
  return new Promise(function (resolve) {
    chrome.alarms.getAll(function (alarms) {
      var alarmsState = {};
      alarms.forEach(function (alarm) {
        alarmsState[alarm.name] = alarm;
      });
      resolve(alarmsState);
    })
  });
}

chrome.runtime.onMessage.addListener(function (state) {
  var promises = [];

  if (!state.postureReminder) {
    promises.push(new Promise(function (resolve) {
      chrome.alarms.clear('POSTURE_REMINDER', resolve);
    }));
  } else {
    promises.push(new Promise(function (resolve) {
      chrome.alarms.get('POSTURE_REMINDER', function (alarm) {
        if (!alarm) {
          chrome.alarms.create('POSTURE_REMINDER', {
            periodInMinutes: 10
          });
          postureAudio();
        }
        resolve();
      });
    }))
  }

  if (!state.limberReminder) {
    promises.push(new Promise(function (resolve) {
      chrome.alarms.clear('LIMBER_REMINDER', resolve);
    }));
  } else {
    promises.push(new Promise(function (resolve) {
      chrome.alarms.get('LIMBER_REMINDER', function (alarm) {
        if (!alarm) {
          chrome.alarms.create('LIMBER_REMINDER', {
            periodInMinutes: 30
          });
          limberAudio();
        }
        resolve();
      });
    }))
  }

  Promise.all(promises).then(function () {
    getAlarms().then(function (alarmsState) {
      chrome.runtime.sendMessage(alarmsState);
    })
  });
});

chrome.alarms.onAlarm.addListener(function (alarm) {
  switch (alarm.name) {
    case 'POSTURE_REMINDER':
      postureAudio();
      break;

    case 'LIMBER_REMINDER':
      limberNotification();
      break;
    default:
      console.error('Unknown alarm', alarm);
  }

  getAlarms().then(function (alarms) {
    chrome.runtime.sendMessage(alarms);
  })
});
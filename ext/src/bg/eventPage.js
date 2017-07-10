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

var POSTURE_TONES = [
  "posture-0.mp3",
  "posture-1.mp3",
  "posture-2.mp3",
  "posture-3.mp3"
];

var LIMBER_IDLE = 5 * 60, // 5 minutes in seconds
  BADGE_BG1 = [242, 69, 62, 255],
  BADGE_BG2 = [33, 150, 243, 255],
  badgeAnimation = undefined;

function createNotification(title, name, message) {
  chrome.notifications.create(name + '_' + Date.now(), {
    type: 'basic',
    title: title,
    iconUrl: chrome.runtime.getURL('icons/icon128.png'),
    message: message,
    priority: 2
  });
}

function getRandomFromArray(array) {
  return array[Math.floor(array.length * Math.random())];
}

function limberNotification() {
  createNotification('Limber up!', 'LIMBER_REMINDER', getRandomFromArray(LIMBER_PHRASES));
  limberAudio();
}

function limberAudio() {
  var myAudio = new Audio();
  myAudio.src = "media/limber.mp3";
  myAudio.play();
}

function postureNotification() {
  postureAudio();
  animateBadge('move');
}

function postureAudio() {
  var myAudio = new Audio(),
    filename = getRandomFromArray(POSTURE_TONES);
  myAudio.src = "media/" + filename;
  myAudio.play();
}

function animateBadge(text) {
  if (badgeAnimation) {
    return;
  }

  var index1 = 0, index2 = 0, badgeBgFlip = false;

  badgeAnimation = setInterval(function () {
    chrome.browserAction.setBadgeBackgroundColor({ color : badgeBgFlip ? BADGE_BG1 : BADGE_BG2});

    if (index1 >= text.length && index2 > text.length) {
      clearInterval(badgeAnimation);
      badgeAnimation = undefined
    } else if (index1 >= text.length) {
      chrome.browserAction.setBadgeText({ text: text.slice(index2) })
      index2++;
    } else {
      chrome.browserAction.setBadgeText({ text: text.slice(0, index1 + 1) })
      index1++;
    }

    badgeBgFlip = !badgeBgFlip;
  }, 300);
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

function handleAlarmAction(alarm) {
  switch (alarm.name) {
    case 'POSTURE_REMINDER':
      postureNotification();
      break;

    case 'LIMBER_REMINDER':
      limberNotification();
      break;
    default:
      console.error('Unknown alarm', alarm);
  }
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
          // sampling the notification for the user
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
          // sampling the notification for the user
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
  chrome.idle.queryState(LIMBER_IDLE, function(idleState) {
    if (idleState === "active") {
      handleAlarmAction(alarm);
    }

    getAlarms().then(function (alarms) {
      chrome.runtime.sendMessage(alarms);
    })
  });
});
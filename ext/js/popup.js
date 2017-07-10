var limber = {
  elements: {
    postureContainer: null,
    postureCheckbox: null,
    postureStatus: null,
    postureReminder: null,
    limberContainer: null,
    limberCheckbox: null,
    limberStatus: null,
    limberReminder: null
  },
  state: {
    postureReminder: null,
    limberReminder: null
  },
  alarms: {
    
  }
};

var TEXT = {
  SPINE_HEALTH: {
    0 : ['stiff', 'limp', 'weak', 'embarassing'],
    1 : ['mediocre', 'could be better', 'almost limber'],
    2 : ['outstanding', 'optimal', 'limber']
  }
};

var CLASSES = {
  'HIDDEN': 'hidden'
};

window.onload = function () {
  limber.elements = getSpecialElements();
  connectElementsBehavior(limber.elements);

  chrome.storage.local.get('state', function (storage) {
    reducer({ type: 'LOAD_STATE', state : storage.state })
  });

  setInterval(updateLiveVariables, 1000);
}

chrome.runtime.onMessage.addListener(function (alarms) {
  reducer({ type : 'SET_ALARMS', alarms: alarms });
})

function propagateDataToDOM() {
  var health = 0;

  limber.elements.limberStatus.innerHTML = limber.state.limberReminder ? 'notification every 30 minutes. upcoming:' : 'reminder disabled';
  limber.elements.postureStatus.innerHTML = limber.state.postureReminder ? 'short tune every 10 minutes. upcoming:' : 'reminder disabled';

  limber.elements.limberCheckbox.checked = limber.state.limberReminder;
  limber.elements.postureCheckbox.checked = limber.state.postureReminder;

  limber.elements.limberContainer.classList.toggle('checked', limber.state.limberReminder);
  limber.elements.postureContainer.classList.toggle('checked', limber.state.postureReminder);

  if (limber.alarms.LIMBER_REMINDER) {
    health++;
    limber.elements.limberReminder.classList.remove(CLASSES.HIDDEN);
  } else {
    limber.elements.limberReminder.innerHTML = '';
    limber.elements.limberReminder.classList.add(CLASSES.HIDDEN);
  }

  if (limber.alarms.POSTURE_REMINDER) {
    health++;
    limber.elements.postureReminder.classList.remove(CLASSES.HIDDEN);
  } else {
    limber.elements.postureReminder.innerHTML = '';
    limber.elements.postureReminder.classList.add(CLASSES.HIDDEN);
  }

  updateLiveVariables({ health: health });
}

function updateLiveVariables(variables) {
  variables = variables || {};

  if (limber.alarms.LIMBER_REMINDER) {
    limber.elements.limberReminder.innerHTML = parseTime(limber.alarms.LIMBER_REMINDER);
  }

  if (limber.alarms.POSTURE_REMINDER) {
    limber.elements.postureReminder.innerHTML = parseTime(limber.alarms.POSTURE_REMINDER);
  }

  if (Number.isInteger(variables.health) && variables.health !== limber.health) {
    limber.health = variables.health;
    limber.elements.healthCaption.className = 'spine-health-' + limber.health;
    limber.elements.healthCaption.innerHTML = TEXT.SPINE_HEALTH[limber.health][Math.floor(TEXT.SPINE_HEALTH[limber.health].length * Math.random())]
  }
}

function parseTime(alarm) {
  var timeLeft = Math.floor((alarm.scheduledTime - Date.now()) / 1000),
    recurringEvery = alarm.periodInMinutes,
    timeLeftSeconds = timeLeft % 60,
    timeLeftMinutes = Math.floor(timeLeft / 60) % 60,
    timeLeftHours = Math.floor(timeLeft / 3600) % 24,
    timeString = '';

  timeLeftSeconds = timeLeftSeconds < 10 ? '0' + timeLeftSeconds : timeLeftSeconds.toString();
  timeLeftMinutes = timeLeftMinutes < 10 && timeLeftHours > 0 ? '0' + timeLeftMinutes : timeLeftMinutes.toString();

  timeString = timeLeftMinutes + ':' + timeLeftSeconds;

  if (timeLeftHours > 0) {
    timeString = timeLeftHours + ':' + timeString;
  }
  
  return timeString;
}

function getSpecialElements() {
  return {
    postureContainer: document.getElementById('posture-container'),
    postureCheckbox: document.getElementById('posture-checkbox'),
    postureStatus: document.getElementById('posture-status'),
    postureReminder: document.getElementById('posture-reminder'),
    limberContainer: document.getElementById('limber-container'),
    limberCheckbox: document.getElementById('limber-checkbox'),
    limberStatus: document.getElementById('limber-status'),
    limberReminder: document.getElementById('limber-reminder'),
    healthCaption: document.getElementById('spine-health-caption')
  };
}

function connectElementsBehavior() {
  limber.elements.postureCheckbox.onchange = togglePostureReminder.bind(this);
  limber.elements.limberCheckbox.onchange = toggleLimberReminder.bind(this);
}

function togglePostureReminder() {
  reducer({ type : 'TOGGLE_POSTURE' });
}

function toggleLimberReminder() {
  reducer({ type: 'TOGGLE_LIMBER' });
}

function reducer(action) {
  var updateEventPage = false;

  switch (action.type) {
    case 'LOAD_STATE':
      updateEventPage = true;
      limber.state = Object.assign({}, limber, action.state)
      break;

    case 'TOGGLE_POSTURE':
      updateEventPage = true;
      limber.state = Object.assign({}, limber.state, {
        postureReminder: !limber.state.postureReminder
      });
      break;

    case 'TOGGLE_LIMBER':
      updateEventPage = true;
      limber.state = Object.assign({}, limber.state, {
        limberReminder: !limber.state.limberReminder
      });
      break;
    
    case 'SET_ALARMS':
      limber = Object.assign({}, limber, {
        state: {
          postureReminder: !!action.alarms.POSTURE_REMINDER,
          limberReminder: !!action.alarms.LIMBER_REMINDER
        },
        alarms: action.alarms
      });
      break;

    default:
      console.warning('no action selected!')
  }

  propagateDataToDOM();

  if (updateEventPage) {
    chrome.runtime.sendMessage(limber.state);
  }

  chrome.storage.local.set({ state: limber.state });
}
import {
  API_BASE_URL,
  TOPICS_STORAGE_KEY,
  PREF_STORAGE_KEY,
  DEFAULT_PREF_ID
} from "./constants";
import axios from "axios";
import qs from "qs";

type Event = {
  title: string;
  url: string;
  owner: string;
  topic: string;
  place: { lon: number; lat: number };
};

type NotiConnAPIResponse = {
  message: Array<Event>;
};

const pushNotification = (event: Event) => {
  const options = {
    iconUrl: "icon128.png",
    type: "basic",
    title: `NotiConn`,
    message: `${event.topic}に関連するイベントが公開されました\n${event.title} by ${event.owner}\n${event.url}`
  };

  chrome.notifications.create(event.url, options);
};

const fetchEvents = async (topics: string[], pref: string) => {
  await axios
    .get<NotiConnAPIResponse>(`${API_BASE_URL}/events`, {
      params: { topics, pref },
      paramsSerializer: params => {
        return qs.stringify(params, { arrayFormat: "repeat" });
      }
    })
    .then(response => {
      const { data: events } = response;
      events.message.forEach(event => {
        pushNotification(event);
      });
    });
};

const main = () => {
  // UTCの 1970/01/01 00:15:00 基準
  const when = new Date(Date.UTC(70, 1)).setHours(0, 15, 0, 0);
  const periodInMinutes = 60;
  const alarmName = "fetchEvents";

  chrome.alarms.create(alarmName, { when, periodInMinutes });

  chrome.alarms.onAlarm.addListener(alarm => {
    if (alarm.name === alarmName) {
      const topics = Object.keys(
        JSON.parse(localStorage.getItem(TOPICS_STORAGE_KEY) || "{}")
      );
      const pref =
        JSON.parse(localStorage.getItem(PREF_STORAGE_KEY) || "{}").value ||
        DEFAULT_PREF_ID;
      if (topics.length === 0) {
        return;
      }
      fetchEvents(topics, pref);
    }
  });

  chrome.notifications.onClicked.addListener(notificationId => {
    chrome.tabs.create({ url: notificationId });
    chrome.notifications.clear(notificationId);
  });
};

main();

(() => {
  'use strict';

  const TIME_ZONE = 'Asia/Tokyo';
  const ATTENDANCE_BASE = 'https://attendance.is.chibatech.ac.jp/attendance/class_room/';
  const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
  const WEEKDAY_NUMBERS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  // 最初の時限の開始時刻を基準とする。複数時限の講義も1件として扱う。
  const courses = [
    { day: 1, periods: '1・2限', name: '機械学習応用', start: '09:00', room: '646' },
    { day: 1, periods: '3・4限', name: '人間工学', start: '11:00', room: '646' },
    { day: 1, periods: '6・7・8・9限', name: 'サイバーセキュリティ実験', start: '14:00', room: '7302' },
    { day: 2, periods: '2・3限', name: 'IoTシステム', start: '10:00', room: '7303' },
    { day: 2, periods: '5・6・7・8限', name: 'IoTシステム構築実験', start: '13:00', room: '7303' },
    { day: 3, periods: '2・3限', name: '情報倫理', start: '10:00', room: '646' },
    { day: 3, periods: '5・6限', name: '国際社会論', start: '13:00', room: '625' },
    { day: 4, periods: '1・2限', name: '地球科学', start: '09:00', room: '636' },
    { day: 4, periods: '3・4限', name: 'サイバーセキュリティ', start: '11:00', room: '7302' },
    { day: 5, periods: '5・6・7・8限', name: 'Webプログラミング応用実験', start: '13:00', room: '7303' }
  ];

  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE, weekday: 'short', year: 'numeric', month: 'numeric',
    day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });

  // OSのタイムゾーン設定に依存せず、日本時間の曜日と分を取得する。
  function getJapanTime(date = new Date()) {
    const parts = Object.fromEntries(
      dateFormatter.formatToParts(date)
        .filter(part => part.type !== 'literal')
        .map(part => [part.type, part.value])
    );
    return {
      year: Number(parts.year), month: Number(parts.month), date: Number(parts.day),
      weekday: WEEKDAY_NUMBERS[parts.weekday],
      hours: Number(parts.hour), minutes: Number(parts.minute),
      totalMinutes: Number(parts.hour) * 60 + Number(parts.minute)
    };
  }

  function timeToMinutes(value) {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  }

  function formatMinutes(value) {
    const hour = String(Math.floor(value / 60)).padStart(2, '0');
    const minute = String(value % 60).padStart(2, '0');
    return `${hour}:${minute}`;
  }

  function getAttendanceStatus(course, nowMinutes) {
    const start = timeToMinutes(course.start);
    if (nowMinutes < start - 30) return 'before';
    if (nowMinutes < start + 60) return 'open'; // 終了時刻ちょうどは含まない
    return 'ended';
  }

  function isMobileOrTablet() {
    const ua = navigator.userAgent || '';
    const platform = navigator.platform || '';
    // Windows・一般的なデスクトップPCは案内画面にする。
    if (/Windows NT|CrOS|X11/.test(ua)) return false;
    // iPadOSの一部はデスクトップMacと同じUser-Agentを使う。
    if ((platform === 'MacIntel' || /Macintosh/.test(ua)) && navigator.maxTouchPoints > 1) return true;
    if (/iPhone|iPad|iPod|Android|Tablet|Silk|Kindle|PlayBook|Mobile/i.test(ua)) return true;
    return navigator.userAgentData?.mobile === true;
  }

  function element(tag, className, text) {
    const item = document.createElement(tag);
    if (className) item.className = className;
    if (text !== undefined) item.textContent = text;
    return item;
  }

  function renderCourse(course, nowMinutes) {
    const status = getAttendanceStatus(course, nowMinutes);
    const card = element('article', 'course-card' + (status === 'open' ? ' is-open' : ''));
    const top = element('div', 'course-top');
    top.append(element('span', 'period', course.periods));

    const labels = { before: '受付前', open: '受付中', ended: '受付終了' };
    const badge = element('span', 'status' + (status === 'open' ? ' open' : ''), labels[status]);
    badge.setAttribute('aria-label', `出席状態：${labels[status]}`);
    top.append(badge);
    card.append(top);

    card.append(element('h3', 'course-name', course.name));
    const start = timeToMinutes(course.start);
    card.append(element('p', 'course-time', `受付時間 ${formatMinutes(start - 30)}〜${formatMinutes(start + 60)}`));

    if (status === 'open') {
      const link = element('a', 'attendance-link', '出席ページを開く');
      link.href = `${ATTENDANCE_BASE}${course.room}`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', `${course.name}の出席ページを新しいタブで開く`);
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      icon.classList.add('external-icon');
      icon.setAttribute('viewBox', '0 0 24 24');
      icon.setAttribute('fill', 'none');
      icon.setAttribute('stroke', 'currentColor');
      icon.setAttribute('stroke-width', '2');
      icon.setAttribute('stroke-linecap', 'round');
      icon.setAttribute('stroke-linejoin', 'round');
      icon.setAttribute('aria-hidden', 'true');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M14 5h5v5 M19 5 10 14 M19 13v6H5V5h6');
      icon.append(path);
      link.append(icon);
      card.append(link);
    }
    return card;
  }

  const app = document.getElementById('app');
  const notice = document.getElementById('desktop-notice');
  const loading = document.getElementById('loading');
  const dateEl = document.getElementById('current-date');
  const countEl = document.getElementById('course-count');
  const listEl = document.getElementById('course-list');
  let lastRenderedState = null;
  let updateTimer = null;

  function refresh() {
    const permitted = isMobileOrTablet();
    app.hidden = !permitted;
    notice.hidden = permitted;
    loading.hidden = true;
    if (!permitted) return;

    const now = getJapanTime();
    const hours = String(now.hours).padStart(2, '0');
    const minutes = String(now.minutes).padStart(2, '0');
    dateEl.textContent = `${now.year}年${now.month}月${now.date}日（${WEEKDAYS[now.weekday]}） ${hours}:${minutes}`;

    const todayCourses = courses.filter(course => course.day === now.weekday);
    countEl.textContent = `${todayCourses.length}講義`;
    const stateKey = `${now.year}-${now.month}-${now.date}|${todayCourses.map(course => getAttendanceStatus(course, now.totalMinutes)).join(',')}`;
    // 時間のみ変わり、出席状態に変化がない場合はカードを作り直さない。
    if (stateKey === lastRenderedState) return;
    lastRenderedState = stateKey;

    listEl.replaceChildren();
    if (!todayCourses.length) {
      const empty = element('div', 'empty-state');
      empty.append(element('p', '', '本日の講義はありません。'));
      listEl.append(empty);
    } else {
      listEl.append(...todayCourses.map(course => renderCourse(course, now.totalMinutes)));
    }
  }

  function scheduleRefresh() {
    if (updateTimer !== null) clearTimeout(updateTimer);
    refresh();
    // 次の分の先頭で再判定。タイマー停止中からの復帰も下記イベントで補う。
    const delay = 60000 - (Date.now() % 60000) + 50;
    updateTimer = setTimeout(scheduleRefresh, delay);
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) scheduleRefresh();
  });
  window.addEventListener('pageshow', scheduleRefresh);
  window.addEventListener('focus', scheduleRefresh);
  scheduleRefresh();
})();

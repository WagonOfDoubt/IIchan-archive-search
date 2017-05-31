// ==UserScript==
// @name         IIchan archive search
// @namespace    https://github.com/WagonOfDoubt/IIchan-archive-search
// @version      0.1
// @description  try to take over the world!
// @icon         http://iichan.hk/favicon.ico
// @author       Cirno
// @updateURL    https://raw.github.com/WagonOfDoubt/IIchan-archive-search/master/IIchan-archive-search.user.js
// @include      http://iichan.hk/*/arch/res/*
// @exclude      http://iichan.hk/*/arch/res/*.html
// @grant        none
// ==/UserScript==

/* jshint esversion: 6 */
(function() {
  'use strict';

  const MAX_OPPOST_LENGTH = 200;
  const LOCALSTORAGE_KEY = 'iichan_archive';
  const getBoard = () => window.location.href.match(/(?:iichan\.hk\/)(.*)(?=\/arch\/res\/)/)[1];

  class Storage {
    constructor(board) {
      this.localArchive = Storage.load();
      if (!(board in this.localArchive)) {
        this.localArchive[board] = {};
      }
      this.boardArchive = this.localArchive[board];
      this.threadsSaved = Object.keys(this.boardArchive).length;
    }

    addThread(thread) {
      this.boardArchive[thread.id] = thread;
      Storage.save(this.localArchive);
    }

    getThread(threadId) {
      return this.boardArchive[threadId];
    }

    static load() {
      return JSON.parse(window.localStorage.getItem(LOCALSTORAGE_KEY) || '{}');
    }

    static save(object) {
      window.localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(object));
    }
  }

  class UpdateQueue {
    constructor(storage, callback) {
      this.storage = storage;
      this.threadLoadedCallback = callback;
      this.queue = [];
      this.isRunning = false;
      this._pendingXHR = null;
    }

    start() {
      this.isRunning = this.queue.length > 0;
      if (this.isRunning) {
        this.loadThread(this.queue.pop());
      }
    }

    stop() {
      this.isRunning = false;
      if (this._pendingXHR) {
        this._pendingXHR.abort();
        this._pendingXHR = null;
      }
    }

    clear() {
      this.stop();
      this.queue.length = 0;
    }

    add(threads) {
      this.queue.push.apply(this.queue, threads);
    }

    get size() {
      return this.queue.length;
    }

    loadThread(threadId) {
      const savedThread = this.storage.getThread(threadId);
      if (savedThread) {
        if (this.threadLoadedCallback) {
          this.threadLoadedCallback(savedThread);
        }

        if (this.queue.length > 0) {
          this.loadThread(this.queue.pop());
        } else {
          this.stop();
        }
      } else {
        const url = `${ window.location.origin }${ window.location.pathname }${ threadId }.html`;
        this.loadDoc(url);
      }
    }

    loadDoc(url) {
      const xhr = new XMLHttpRequest();
      const self = this;
      xhr.onload = function() {
        if (self._pendingXHR === xhr) {
          self._pendingXHR = null;
        }
        if (this.status == 200) {
          self.onThreadLoaded(this.response);
        } else {
          // reject(this.stats);
        }
      };
      xhr.onerror = function() {
        if (self._pendingXHR === xhr) {
          self._pendingXHR = null;
        }
        // reject(this.stats);
      };
      self._pendingXHR = xhr;
      xhr.open("GET", url, true);
      xhr.send();
    }

    onThreadLoaded(response) {
      const newThread = ThreadParser.parseThread(response);
      this.storage.addThread(newThread);
      if (this.threadLoadedCallback) {
        this.threadLoadedCallback(newThread);
      }

      if (this.queue.length > 0) {
        this.loadThread(this.queue.pop());
      } else {
        this.stop();
      }
    }
  }

  class TableParser {
    static _parseRow(row) {
      const COL = {
        'name': 1,
        'modified': 2,
        'size': 3
      };
      const cols = row.querySelectorAll('td');
      if (cols.length < 5) {
        return null;
      }
      const el_link = cols[COL.name].querySelector('a');
      if (!el_link) {
        return null;
      }
      const size = cols[COL.size].innerText;
      if (size === '-') {
        return null;
      }

      return {
        'href': el_link.href,
        'id': el_link.innerText.split('.')[0],
        'year': cols[COL.modified].innerText.match(/\d{4}/)[0]
      };
    }

    static parseTable(callback) {
      const table = document.querySelector('table');
      const rows = table.querySelectorAll('tr');
      for (let row of rows) {
        let thread = this._parseRow(row);
        if (thread) {
          callback(thread);
        }
      }
    }
  }

  class ThreadParser {
    static _getVal(parent, q, field) {
      const el = parent.querySelector(q);
      return (el && el[field].toString().trim()) || '';
    }

    static _getTextNode(parent, q) {
      const el = parent.querySelector(q);
      let text = '';
      for (let node of el.childNodes) {
        if (node.nodeName === '#text') {
          text += node.textContent;
        }
      }
      return text.trim();
    }

    static _getQuantity(parent, q) {
      return parent.querySelectorAll(q).length;
    }

    static _parseDate(text) {
      const matches = text.match(/[А-я]{2}\s(\d+)\s([А-я]+)\s(\d{4})\s(\d{2}:\d{2}:\d{2})/);
      // "Пн 21 января 2008 19:44:32", "21", "января", "2008", "19:44:32"
      const month = matches[2];
      const localeMonths = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
      const m = localeMonths.indexOf(month) + 1;
      // 2011-10-10T14:48:00
      return Date.parse(`${matches[3]}-${m}-${matches[1]}T${matches[4]}`);
    }

    static parseThread(html) {
      const query = {
        id: 'div[id^="thread"] a[name]',
        thumb: 'div[id^="thread"] img.thumb',
        subject: 'div[id^="thread"] .filetitle',
        post: 'div[id^="thread"] > blockquote',
        created: 'div[id^="thread"] a + label',
        bumped: 'div[id^="thread"] > table:last-child a + label',
        replies: 'div[id^="thread"] .reply',
        images: 'div[id^="thread"] img.thumb'
      };

      const parser = new DOMParser();
      const thread = parser.parseFromString(html, "text/html");

      return {
        id: this._getVal(thread, query.id, 'name'),
        thumb: this._getVal(thread, query.thumb, 'src'),
        subject: this._getVal(thread, query.subject, 'innerText'),
        post: this._getVal(thread, query.post, 'innerText').replace(/(\r\n|\n|\r)/gm, ' ').substr(0, MAX_OPPOST_LENGTH),
        created: this._parseDate(this._getTextNode(thread, query.created)),
        bumped: this._parseDate(this._getTextNode(thread, query.bumped)),
        replies: this._getQuantity(thread, query.replies),
        images: this._getQuantity(thread, query.images)
      };
    }
  }

  const constructPage = (stats) => {
    document.head.insertAdjacentHTML('beforeend', `<style type="text/css">
      .ii-years a { cursor: pointer; }
      .ii-years a.current { color: unset; font-weight: bold; }
      .ii-years span:not(:first-child) { margin-left: .5em; }
      .ii-years span::before { content: '['; }
      .ii-years span::after { content: ']'; }
      </style>`);
    document.head.insertAdjacentHTML('beforeend', `<style type="text/css"> body { margin: 0; padding: 8px; margin-bottom: auto; } blockquote blockquote { margin-left: 0em } form { margin-bottom: 0px } form .trap { display:none } .postarea { text-align: center } .postarea table { margin: 0px auto; text-align: left } .thumb { border: none; float: left; margin: 2px 20px } .nothumb { float: left; background: #eee; border: 2px dashed #aaa; text-align: center; margin: 2px 20px; padding: 1em 0.5em 1em 0.5em; } .reply blockquote, blockquote :last-child { margin-bottom: 0em } .reflink a { color: inherit; text-decoration: none } .reply .filesize { margin-left: 20px } .userdelete { float: right; text-align: center; white-space: nowrap } .replypage .replylink { display: none } .catthread { vertical-align: top; word-wrap: break-word; overflow: hidden; display:inline-block; padding: 4px; width:210px; max-height:350px; min-height:200px; margin-top: 5px; position: relative; } .catthread a {text-decoration: none; !important;} .catthread img {border:none; float: unset;}  .catthreadlist    { padding: 20px 0px; text-align: center; } </style>`);
    document.head.insertAdjacentHTML('beforeend', `<link rel="alternate stylesheet" type="text/css" href="/cgi-bin/../css/burichan.css" title="Burichan">`);
    document.head.insertAdjacentHTML('beforeend', `<link rel="stylesheet" type="text/css" href="/cgi-bin/../css/futaba.css" title="Futaba">`);
    document.head.insertAdjacentHTML('beforeend', `<link rel="alternate stylesheet" type="text/css" href="/cgi-bin/../css/gurochan.css" title="Gurochan">`);
    document.body.innerHTML = `<h1 class="logo">Ычан — Архив /${ stats.board }/</h1>
    <hr>
    <div>[<a href="/${ stats.board }/index.html">Назад в /${ stats.board }/</a>]</div>
    <div class="theader">Архив <b>(${ stats.threadsTotal })</b></div>
    <div class="postarea ii-years"></div>
    <div class="postarea">
    <table class="ii-loader">
    <tbody>
    <tr>
    <td><span class="ii-loader-label">Обновление списка тредов...</span></td>
    <td><progress value="${ stats.threadsSaved }" max="${ stats.threadsTotal }"></progress></td>
    <td>(<span class="ii-lodaer-value">${ stats.threadsSaved }</span>/<span class="ii-loader-total">${ stats.threadsTotal }</span>)</td>
    </tr>
    </tbody>
    </table>
    </div>
    <!-- <div class="postarea">
    <table style="margin: inherit;">
    <tbody>
    <tr>
    <td class="postblock">&nbsp;Поиск&nbsp;<a target="_blank" href="#" style="font-weight: normal;">[?]</a></td>
    <td>
    <input size="28" type="text" autocomplete="off" title="Поиск" id="searchbox" placeholder="Начните ввод для поиска...">
    <button id="clearbtn">ｘ</button>
    </td>
    </tr>
    <tr>
    <td class="postblock">Сортировка&nbsp;&nbsp;</td>
    <td>
    <label style="cursor: pointer;">[<input name="sortmode" type="radio" value="0" checked> последний бамп &nbsp; /</label>
    <label style="cursor: pointer;"><input name="sortmode" type="radio" value="1"> дата создания &nbsp; /</label>
    <label style="cursor: pointer;"><input name="sortmode" type="radio" value="2"> количество постов &nbsp; /</label>
    <label style="cursor: pointer;"><input name="sortmode" type="radio" value="3"> количество изображений ]</label>
    <br>
    <label style="cursor: pointer;">[<input name="sortdirection" type="radio" value="1" checked> по убыванию &nbsp; /</label>
    <label style="cursor: pointer;"><input name="sortdirection" type="radio" value="0"> по возрастанию ]</label>
    </td>
    </tr>
    </tbody>
    </table>
    </div> -->
    <div class="catthreadlist">
    </div>
    <div>[<a href="/${ stats.board }/index.html">Назад в /${ stats.board }/</a>]</div>
    <hr>`;
  };

  const createThread = (thread) => {
    const parent = document.querySelector('.catthreadlist');
    const createdDate = (new Date(thread.created)).toLocaleDateString();
    const bumpedDate = (new Date(thread.bumped)).toLocaleDateString();

    parent.insertAdjacentHTML('beforeend', `<a title="#${ thread.id } (${ createdDate } - ${ bumpedDate })" href="./${ thread.id }.html"><div class="catthread">
      <img src="${ thread.thumb }" alt="${ thread.id }">
      <div><span title="Постов в треде">${ thread.replies + 1 }</span>/<span title="Картинок в треде">${ thread.images }</span></div>
      <div class="postertrip">[${ createdDate } - ${ bumpedDate }]</div>
      <div class="filetitle">${ thread.subject }</div>
      <span class="cattext">${ thread.post }</span>
      </div></a>`);
  };

  const setStylesheet = () => {
    const getCookie = (n) => {
      let a = `; ${document.cookie}`.match(`;\\s*${n}=([^;]+)`);
      return a ? a[1] : '';
    };

    const stylesheet = getCookie('wakabastyle') || 'Futaba';
    const links = document.head.querySelectorAll('link');
    for (let link of links) {
      link.disabled = stylesheet !== link.title;
    }
  };

  const main = () => {
    const stats = {};
    stats.board = getBoard();
    if (!stats.board) {
      return;
    }

    const threadsStorage = new Storage(stats.board);
    stats.threadsSaved = threadsStorage.threadsSaved;

    const threadsByYear = {};
    stats.threadsTotal = 0;
    TableParser.parseTable((thread) => {
      stats.threadsTotal++;
      if (!(thread.year in threadsByYear)) {
        threadsByYear[thread.year] = [];
      }
      threadsByYear[thread.year].push(thread.id);
    });
    let currentYear = Object.keys(threadsByYear)[0];

    constructPage(stats);
    setStylesheet();

    const setYear = (y) => {
      currentYear = y;
      document.querySelector('.catthreadlist').innerHTML = '';
      let selectedBtn = document.querySelector('.ii-years a.current');
      if (selectedBtn) {
        selectedBtn.classList.remove('current');
      }
      selectedBtn = document.querySelector(`.ii-years a[data-year="${ y }"]`);
      if (selectedBtn) {
        selectedBtn.classList.add('current');
      }
      updateQueue.add(threadsByYear[y]);
      updateQueue.start();
    };

    const createYearButton = (y) => {
      const numOfThreadsInYear = threadsByYear[y].length;
      const a = document.createElement('a');
      a.year = y;
      a.setAttribute('data-year', y);
      a.innerHTML = `${ y } (${ numOfThreadsInYear })`;
      const years_el = document.querySelector('.ii-years');
      a.addEventListener('click', (e) => setYear(e.target.year));
      const span = document.createElement('span');
      span.appendChild(a);
      years_el.appendChild(span);
    };

    for (let year in threadsByYear) {
      createYearButton(year);
    }

    const updateQueue = new UpdateQueue(threadsStorage, (thread) => {
      createThread(thread);

      const threadsTotal = threadsByYear[currentYear].length;
      const threadsLoaded = threadsTotal - updateQueue.size;
      document.querySelector('.ii-loader progress').value = threadsLoaded;
      document.querySelector('.ii-lodaer-value').innerText = threadsLoaded;
      document.querySelector('.ii-loader progress').max = threadsTotal;
      document.querySelector('.ii-loader-total').innerText = threadsTotal;
      if (threadsTotal === threadsLoaded) {
        document.querySelector('.ii-loader').style.display = 'none';
      } else {
        document.querySelector('.ii-loader').style.display = 'initial';
      }
    });

    setYear(currentYear);
  };

  main();
})();

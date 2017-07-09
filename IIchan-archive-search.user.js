// ==UserScript==
// @name         IIchan archive search
// @namespace    https://github.com/WagonOfDoubt/IIchan-archive-search
// @version      0.1
// @description  try to take over the world!
// @icon         http://iichan.hk/favicon.ico
// @author       Cirno
// @updateURL    https://raw.github.com/WagonOfDoubt/IIchan-archive-search/master/IIchan-archive-search.user.js
// @include      http://iichan.hk/*/arch/res/*
// @include      https://iichan.hk/*/arch/res/*
// @exclude      http://iichan.hk/*/arch/res/*.html
// @exclude      https://iichan.hk/*/arch/res/*.html
// @include      http://410chan.org/*/arch/res/*
// @include      https://410chan.org/*/arch/res/*
// @exclude      http://410chan.org/*/arch/res/*.html
// @exclude      https://410chan.org/*/arch/res/*.html
// @include      http://nowere.net/*/arch/
// @include      https://nowere.net/*/arch/
// @grant        none
// ==/UserScript==

/* jshint esversion: 6 */
(function() {
  'use strict';

  const MAX_OPPOST_LENGTH = 200;
  const LOCALSTORAGE_KEY = 'iichan_archive';

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
    constructor(storage, parser, callback) {
      this.storage = storage;
      this.parserCallback = parser;
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
  
    loadThread(thread) {
      const savedThread = this.storage.getThread(thread.id);
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
        this.loadDoc(thread.url);
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
          self.onThreadLoaded(this.response, url);
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
  
    onThreadLoaded(response, url) {
      const thread = this.parserCallback(response);
      thread.url = url;
  
      if (this.threadLoadedCallback) {
        this.threadLoadedCallback(thread);
      }
  
      if (this.queue.length > 0) {
        this.loadThread(this.queue.pop());
      } else {
        this.stop();
      }
    }
  }
  

  const getImageboard = () => {
    class TableParser {
      constructor() {
    
      }
    
      _parseRow(row) {
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
        if (!el_link || /[\-\+]/.test(el_link.textContent)) {
          return null;
        }
        const size = cols[COL.size].innerText;
        if (size === '-') {
          return null;
        }
    
        return {
          'url': el_link.href,
          'id': el_link.innerText.split('.')[0],
          'year': cols[COL.modified].innerText.match(/\d{4}/)[0]
        };
      }
    
      parseTable(callback) {
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
    
    class TableParserNowere extends TableParser {
      constructor() {
        super();
        this.rMatchYear = /\d{4}/;
        this.rMatchId = /\d+/;
        this.qItems = 'pre > a:not(:first-child)';
      }
    
      parseTable(callback) {
        const links = document.querySelectorAll(this.qItems).forEach((link) => {
          let dateText = link.nextSibling;
          if (dateText && dateText.nodeName === '#text') {
            callback({
              'url': link.href,
              'id': link.textContent.match(this.rMatchId)[0],
              'year': dateText.textContent.match(this.rMatchYear)[0]
            });
          }
        });
      }
    }
    
    class ThreadParser {
      constructor() {
        this.query = {
          id: '#delform a[name]',
          thumb: '#delform img.thumb',
          subject: '#delform .filetitle',
          post: '#delform > blockquote, #delform > div > blockquote',
          created: '#delform a + label',
          bumped: '#delform > table a + label, #delform > div > table a + label',
          replies: '#delform .reply',
          images: '#delform img.thumb'
        };
        this.rDate = /(\d{2})\/(\d{2})\/(\d{2})\([A-Za-z]*\)(\d{2}\:\d{2})/;
      }
    
      _getVal(parent, q, field) {
        const el = parent.querySelector(q);
        return (el && el[field].toString().trim()) || '';
      }
    
      _getTextNode(parent, q, last) {
        last = last || false;
        let el;
        if (last) {
          let queryResult = parent.querySelectorAll(q);
          el = queryResult[queryResult.length - 1];
        } else {
          el = parent.querySelector(q);
        }
        if (!el) {
          return null;
        }
        let text = '';
        for (let node of el.childNodes) {
          if (node.nodeName === '#text') {
            text += node.textContent;
          }
        }
        return text.trim();
      }
    
      _getQuantity(parent, q) {
        return parent.querySelectorAll(q).length;
      }
    
      _parseDate(text) {
        if (!text) {
          return 0;
        }
        // "17/07/08(Sat)18:06", "17", "07", "08", "18:06"
        const matches = text.match(this.rDate);
        if (!matches) {
          return 0;
        }
        // 2017-07-08T18:06:00
        return Date.parse(`20${matches[1]}-${matches[2]}-${matches[3]}T${matches[4]}`) || 0;
      }
    
      _parse(thread) {
        const result = {
          id: this._getVal(thread, this.query.id, 'name'),
          thumb: this._getVal(thread, this.query.thumb, 'src'),
          subject: this._getVal(thread, this.query.subject, 'innerText'),
          post: this._getVal(thread, this.query.post, 'innerText').replace(/(\r\n|\n|\r)/gm, ' ').substr(0, MAX_OPPOST_LENGTH),
          created: this._parseDate(this._getTextNode(thread, this.query.created)),
          bumped: this._parseDate(this._getTextNode(thread, this.query.bumped, true)),
          replies: this._getQuantity(thread, this.query.replies),
          images: this._getQuantity(thread, this.query.images)
        };
        return result;
      }
    
      parseThread(html) {
        const parser = new DOMParser();
        const thread = parser.parseFromString(html, "text/html");
        return this._parse(thread);
      }
    }
    
    class IIchanThreadParser extends ThreadParser {
      constructor() {
        super();
        this.rDate = /[А-я]{2}\s(\d+)\s([А-я]+)\s(\d{4})\s(\d{2}:\d{2}:\d{2})/;
      }
    
      _parseDate(text) {
          if (!text) {
            return 0;
          }
          const matches = text.match(this.rDate);
          // "Пн 21 января 2008 19:44:32", "21", "января", "2008", "19:44:32"
          const month = matches[2];
          const localeMonths = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
          const m = localeMonths.indexOf(month) + 1;
          // 2011-10-10T14:48:00
          return Date.parse(`${matches[3]}-${m}-${matches[1]}T${matches[4]}`) || 0;
      }
    }
    
    class _410chanThreadParser extends ThreadParser {
      constructor() {
        super();
        this.query = {
          id: '#delform a[name]:not(:first-child)',
          thumb: '#delform img.thumb',
          subject: '#delform > div > label > .filetitle',
          post: '#delform > div > .postbody > blockquote, #delform > div > blockquote',
          created: '#delform a + label', created2: '#delform a + label > .time',
          bumped: '#delform > div > a + label', bumped2: '#delform div > a + label > .time',
          replies: '#delform .reply',
          images: '#delform img.thumb'
        };
        this.rDate = /(\d{2})\.(\d{2})\.(\d{4})\D*(\d{2}\:\d{2}\:\d{2})/;  // 22.04.2017 (Сб) 05:49:58
      }
    
      _parseDate(text) {
        if (!text) {
            return 0;
          }
          const matches = text.match(this.rDate);
          if (!matches) {
            return 0;
          }
          // 2017-07-08T18:06:00
          return Date.parse(`${matches[3]}-${matches[2]}-${matches[1]}T${matches[4]}`) || 0;
      }
    
      _parse(thread) {
        const result = {
          id: this._getVal(thread, this.query.id, 'name'),
          thumb: this._getVal(thread, this.query.thumb, 'src'),
          subject: this._getVal(thread, this.query.subject, 'innerText'),
          post: this._getVal(thread, this.query.post, 'innerText').replace(/(\r\n|\n|\r)/gm, ' ').substr(0, MAX_OPPOST_LENGTH),
          created: this._parseDate(this._getTextNode(thread, this.query.created)) || this._parseDate(this._getTextNode(thread, this.query.created2)),
          bumped: this._parseDate(this._getTextNode(thread, this.query.bumped, true)) || this._parseDate(this._getTextNode(thread, this.query.bumped2, true)),
          replies: this._getQuantity(thread, this.query.replies),
          images: this._getQuantity(thread, this.query.images)
        };
        return result;
      }
    }
    
    
    class BaseBoard {
      constructor(name) {
        this.boardName = name || '';
        this.rBoardMatch = /(?:[^:/]*\.[^:/]*)\/([^:/]*)/;
        this.tableParser = new TableParser();
        this.threadParser = new ThreadParser();
        this.styleCookie = 'wakabastyle';
        this.defaultStyle = 'Futaba';
      }
    
      setStylesheet() {
        const getCookie = (n) => {
          let a = `; ${ document.cookie }`.match(`;\\s*${n}=([^;]+)`);
          return a ? a[1] : '';
        };
    
        const stylesheet = getCookie(this.styleCookie) || this.defaultStyle;
        const links = document.head.querySelectorAll('link');
        for (let link of links) {
          link.disabled = stylesheet !== link.title;
        }
      }
    
      constructPage(stats) {
        document.head.insertAdjacentHTML('beforeend', `
          <style type="text/css">
          .ii-years a {
            cursor: pointer;
          }
          
          .ii-years a.current {
            color: unset;
            font-weight: bold;
          }
          
          .ii-years span:not(:first-child) {
            margin-left: .5em;
          }
          
          .ii-years span::before {
            content: '[';
          }
          
          .ii-years span::after {
            content: ']';
          }
          </style>
          <style type="text/css">
          body {
            margin: 0;
            padding: 8px;
            margin-bottom: auto;
          }
          
          blockquote blockquote {
            margin-left: 0em
          }
          
          form {
            margin-bottom: 0px
          }
          
          form .trap {
            display: none
          }
          
          .postarea {
            text-align: center
          }
          
          .postarea table {
            margin: 0px auto;
            text-align: left
          }
          
          .thumb {
            border: none;
            float: left;
            margin: 2px 20px
          }
          
          .nothumb {
            float: left;
            background: #eee;
            border: 2px dashed #aaa;
            text-align: center;
            margin: 2px 20px;
            padding: 1em 0.5em 1em 0.5em;
          }
          
          .reply blockquote,
          blockquote:last-child {
            margin-bottom: 0em
          }
          
          .reflink a {
            color: inherit;
            text-decoration: none
          }
          
          .reply .filesize {
            margin-left: 20px
          }
          
          .userdelete {
            float: right;
            text-align: center;
            white-space: nowrap
          }
          
          .replypage .replylink {
            display: none
          }
          
          .catthread {
            vertical-align: top;
            word-wrap: break-word;
            overflow: hidden;
            display: inline-block;
            padding: 4px;
            width: 210px;
            max-height: 350px;
            min-height: 200px;
            margin-top: 5px;
            position: relative;
          }
          
          .catthread a {
            text-decoration: none;
            !important;
          }
          
          .catthread img {
            border: none;
            float: unset;
          }
          
          .catthreadlist {
            padding: 20px 0px;
            text-align: center;
          }
          
          .catthreadlist a {
            display: inline-block;
          }
          </style>
          `);
        document.body.innerHTML = `
        <h1 class="logo">${this.boardName} — Архив /${ stats.board }/</h1>
        <hr>
        <div>[<a href="/${ stats.board }">Назад в /${ stats.board }/</a>]</div>
        <div class="theader replymode">Архив <b>(${ stats.threadsTotal })</b></div>
        <div class="postarea ii-years"></div>
        <div class="postarea">
          <table class="ii-loader">
            <tbody>
              <tr>
                <td><span class="ii-loader-label">Обновление списка тредов...</span></td>
                <td>
                  <progress value="${ stats.threadsSaved }" max="${ stats.threadsTotal }"></progress>
                </td>
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
        <div>[<a href="/${ stats.board }">Назад в /${ stats.board }/</a>]</div>
        <hr>
        
        `;
        this.setStylesheet();
      }
    
      getBoard() {
        return window.location.href.match(this.rBoardMatch)[1];
      }
    
      parseTable(callback) {
        this.tableParser.parseTable(callback);
      }
    
      parseThread(html) {
        return this.threadParser.parseThread(html);
      }
    }
    
    const imageboards = {};
    class IIchan extends BaseBoard {
      constructor() {
        super('Ычан');
        this.threadParser = new IIchanThreadParser();
      }
    
      constructPage(stats) {
        document.head.insertAdjacentHTML('beforeend', `
          <link rel="alternate stylesheet" type="text/css" href="/cgi-bin/../css/burichan.css" title="Burichan">
          <link rel="stylesheet" type="text/css" href="/cgi-bin/../css/futaba.css" title="Futaba">
          <link rel="alternate stylesheet" type="text/css" href="/cgi-bin/../css/gurochan.css" title="Gurochan">
          
          `);
        super.constructPage(stats);
      }
    }
    
    imageboards['iichan.hk'] = IIchan;
    
    class Nowere extends BaseBoard {
      constructor() {
        super('Nowere.net');
        this.tableParser = new TableParserNowere();
      }
    
      constructPage(stats) {
        document.head.insertAdjacentHTML('beforeend', `
          <link rel="alternate stylesheet" type="text/css" href="/a/css/burichan.css" title="Burichan">
          <link rel="alternate stylesheet" type="text/css" href="/a/css/foliant.css" title="Foliant">
          <link rel="stylesheet" type="text/css" href="/a/css/futaba.css" title="Futaba">
          <link rel="alternate stylesheet" type="text/css" href="/a/css/greenhell.css" title="Greenhell">
          <link rel="alternate stylesheet" type="text/css" href="/a/css/gurochan.css" title="Gurochan">
          <link rel="alternate stylesheet" type="text/css" href="/a/css/photon.css" title="Photon">
          `);
        super.constructPage(stats);
      }
    }
    
    imageboards['nowere.net'] = Nowere;
    
    class _410chan extends BaseBoard {
      constructor() {
        super('410chan');
        this.threadParser = new _410chanThreadParser();
        this.styleCookie = 'kustyle';
        this.defaultStyle = 'Umnochan';
      }
    
      constructPage(stats) {
        document.head.insertAdjacentHTML('beforeend', `
          <link rel="stylesheet" type="text/css" href="/css/img_global.css">
          <link rel="stylesheet" type="text/css" href="/css/umnochan.css" title="Umnochan">
          <link rel="alternate stylesheet" type="text/css" href="/css/burichan.css" title="Burichan">
          <link rel="alternate stylesheet" type="text/css" href="/css/futaba.css" title="Futaba">
          <link rel="alternate stylesheet" type="text/css" href="/css/photon.css" title="Photon">
          <link rel="alternate stylesheet" type="text/css" href="/css/kusaba.css" title="Kusaba">
          <link rel="alternate stylesheet" type="text/css" href="/css/bluemoon.css" title="Bluemoon">
          
          `);
        super.constructPage(stats);
      }
    }
    
    imageboards['410chan.org'] = _410chan;
    
    const imageboardClass = imageboards[window.location.hostname] || BaseBoard;
    return new imageboardClass();
  };

  const createThread = (thread) => {
    const parent = document.querySelector('.catthreadlist');
    const createdDate = thread.created ? (new Date(thread.created)).toLocaleDateString() : '';
    const bumpedDate = thread.bumped ? (new Date(thread.bumped)).toLocaleDateString() : '';
    let datesString = '';
    datesString += createdDate;
    if (thread.created && thread.bumped) {
      datesString += ' - ';
    }
    datesString += bumpedDate;

    parent.insertAdjacentHTML('beforeend', `
      <a title="#${ thread.id }${ datesString ? ' (' + datesString + ')' : ''}" href="${ thread.url }">
        <div class="catthread catalogthread">
          <img src="${ thread.thumb }" alt="${ thread.id }" class="catalogpic">
          <div class="catalogposts"><span title="Постов в треде">💬${ thread.replies + 1 }</span> <span title="Картинок в треде">📎${ thread.images }</span></div>
          <div class="postertrip">${ datesString ? '[' + datesString + ']' : ''}</div>
          <div class="filetitle catalogsubject">${ thread.subject }</div>
          <span class="cattext catalogmsg">${ thread.post }</span>
        </div>
      </a>
      
      `);
  };

  const main = () => {
    const imageboard = getImageboard();
    const stats = {};
    stats.board = imageboard.getBoard();
    if (!stats.board) {
      return;
    }

    const threadsStorage = new Storage(stats.board);
    stats.threadsSaved = threadsStorage.threadsSaved;

    const threadsByYear = {};
    stats.threadsTotal = 0;
    imageboard.parseTable((thread) => {
      stats.threadsTotal++;
      if (!(thread.year in threadsByYear)) {
        threadsByYear[thread.year] = [];
      }
      threadsByYear[thread.year].push(thread);
    });
    let currentYear = Object.keys(threadsByYear)[0];

    imageboard.constructPage(stats);

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
      updateQueue.clear();
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

    const updateQueue = new UpdateQueue(threadsStorage,
      (html) => imageboard.parseThread(html),
      (thread) => {
        threadsStorage.addThread(thread);
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
      }
    );

    setYear(currentYear);
  };

  main();
})();

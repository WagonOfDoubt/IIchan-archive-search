/* jshint esversion: 6 */
(function() {
  'use strict';

  const MAX_OPPOST_LENGTH = 200;
  const LOCALSTORAGE_KEY = 'iichan_archive';
  const getBoard = () => window.location.href.match(/(?:[^:/]*\.[^:/]*)\/([^:/]*)/)[1];

  //=include storage.js

  //=include queue.js

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
    document.head.insertAdjacentHTML('beforeend', `
      //=include html/iichan.head.html
      `);
    document.body.innerHTML = `
    //=include html/iichan.body.html
    `;
  };

  const createThread = (thread) => {
    const parent = document.querySelector('.catthreadlist');
    const createdDate = (new Date(thread.created)).toLocaleDateString();
    const bumpedDate = (new Date(thread.bumped)).toLocaleDateString();

    parent.insertAdjacentHTML('beforeend', `
      //=include html/preview.html
      `);
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

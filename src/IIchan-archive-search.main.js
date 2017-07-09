/* jshint esversion: 6 */
(function() {
  'use strict';

  const MAX_OPPOST_LENGTH = 200;
  const LOCALSTORAGE_KEY = 'iichan_archive';

  //=include storage.js

  //=include queue.js

  const getImageboard = () => {
    //=require boards/base.js
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
      //=include html/preview.html
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

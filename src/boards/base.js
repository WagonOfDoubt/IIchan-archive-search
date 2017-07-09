//=require ../parser/table-parser.js
//=require ../parser/thread-parser.js

class BaseBoard {
  constructor(name) {
    this.boardName = name;
    this.rBoardMatch = /(?:[^:/]*\.[^:/]*)\/([^:/]*)/;
    this.tableParser = new TableParser();
    this.threadParser = new ThreadParser();
  }

  setStylesheet() {
    const getCookie = (n) => {
      let a = `; ${document.cookie}`.match(`;\\s*${n}=([^;]+)`);
      return a ? a[1] : '';
    };

    const stylesheet = getCookie('wakabastyle') || 'Futaba';
    const links = document.head.querySelectorAll('link');
    for (let link of links) {
      link.disabled = stylesheet !== link.title;
    }
  }

  constructPage(stats) {
    document.head.insertAdjacentHTML('beforeend', `
      //=include ../html/head.html
      `);
    document.body.innerHTML = `
    //=include ../html/body.html
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
//=require iichan.js
//=require nowere.js
//=require ../parser/table-parser.js
//=require ../parser/thread-parser.js

class BaseBoard {
  constructor(name, { rBoardMatch, tableParser, threadParser, styleCookie, defaultStyle }) {
    this.boardName = name || '';
    this.rBoardMatch = rBoardMatch || /(?:[^:/]*\.[^:/]*)\/([^:/]*)/;
    this.tableParser = tableParser || new TableParser();
    this.threadParser = threadParser || new ThreadParser();
    this.styleCookie = styleCookie || 'wakabastyle';
    this.defaultStyle = defaultStyle || 'Futaba';
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
//=require 410chan.js
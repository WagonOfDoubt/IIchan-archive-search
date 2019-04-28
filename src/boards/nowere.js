class NowereTableParser extends TableParser {
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


class Nowere extends BaseBoard {
  constructor() {
    super('Nowere.net', {
      tableParser: new NowereTableParser(),
    });
  }

  constructPage(stats) {
    document.head.insertAdjacentHTML('beforeend', `
      //=include ../html/nowere.head.html
      `);
    super.constructPage(stats);
  }
}

imageboards['nowere.net'] = Nowere;

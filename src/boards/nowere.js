class Nowere extends BaseBoard {
  constructor() {
    super('Nowere.net');
    this.tableParser = new TableParserNowere();
  }

  constructPage(stats) {
    document.head.insertAdjacentHTML('beforeend', `
      //=include ../html/nowere.head.html
      `);
    super.constructPage(stats);
  }
}

imageboards['nowere.net'] = Nowere;

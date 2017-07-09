class IIchan extends BaseBoard {
  constructor() {
    super('Ычан');
    this.threadParser = new IIchanThreadParser();
  }

  constructPage(stats) {
    document.head.insertAdjacentHTML('beforeend', `
      //=include ../html/iichan.head.html
      `);
    super.constructPage(stats);
  }
}

imageboards['iichan.hk'] = IIchan;

class _410chan extends BaseBoard {
  constructor() {
    super('410chan');
    this.threadParser = new _410chanThreadParser();
    this.styleCookie = 'kustyle';
    this.defaultStyle = 'Umnochan';
  }

  constructPage(stats) {
    document.head.insertAdjacentHTML('beforeend', `
      //=include ../html/410chan.head.html
      `);
    super.constructPage(stats);
  }
}

imageboards['410chan.org'] = _410chan;

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


class IIchan extends BaseBoard {
  constructor() {
    super('Ычан', {
      threadParser: new IIchanThreadParser(),
    });
  }

  constructPage(stats) {
    document.head.insertAdjacentHTML('beforeend', `
      //=include ../html/iichan.head.html
      `);
    super.constructPage(stats);
  }
}


imageboards['iichan.hk'] = IIchan;

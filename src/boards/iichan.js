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
    if (!matches) {
      return 0;
    }
    // "Пн 21 января 2008 19:44:32", "21", "января", "2008", "19:44:32"
    const ruMonth = matches[2];
    const localeMonths = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    const m = localeMonths.indexOf(ruMonth) + 1;
    const year = matches[3];
    const month = (m > 0 ? m.toString() : '0').padStart(2, '0');
    const day = (matches[1] || '0').padStart(2, '0');
    const time = (matches[4] || '00:00');
    // 2011-10-10T14:48:00
    const dateStr = `${year}-${month}-${day}T${time}`;
    return Date.parse(dateStr) || 0;
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

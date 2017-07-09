class ThreadParser {
  constructor() {
    this.query = {
      id: '#delform a[name]',
      thumb: '#delform img.thumb',
      subject: '#delform .filetitle',
      post: '#delform > blockquote, #delform > div > blockquote',
      created: '#delform a + label',
      bumped: '#delform > table a + label, #delform > div > table a + label',
      replies: '#delform .reply',
      images: '#delform img.thumb'
    };
    this.rDate = /(\d{2})\/(\d{2})\/(\d{2})\([A-Za-z]*\)(\d{2}\:\d{2})/;
  }

  _getVal(parent, q, field) {
    const el = parent.querySelector(q);
    return (el && el[field].toString().trim()) || '';
  }

  _getTextNode(parent, q, last) {
    last = last || false;
    let el;
    if (last) {
      let queryResult = parent.querySelectorAll(q);
      el = queryResult[queryResult.length - 1];
    } else {
      el = parent.querySelector(q);
    }
    if (!el) {
      return null;
    }
    let text = '';
    for (let node of el.childNodes) {
      if (node.nodeName === '#text') {
        text += node.textContent;
      }
    }
    return text.trim();
  }

  _getQuantity(parent, q) {
    return parent.querySelectorAll(q).length;
  }

  _parseDate(text) {
    if (!text) {
      return 0;
    }
    // "17/07/08(Sat)18:06", "17", "07", "08", "18:06"
    const matches = text.match(this.rDate);
    if (!matches) {
      return 0;
    }
    // 2017-07-08T18:06:00
    return Date.parse(`20${matches[1]}-${matches[2]}-${matches[3]}T${matches[4]}`) || 0;
  }

  _parse(thread) {
    const result = {
      id: this._getVal(thread, this.query.id, 'name'),
      thumb: this._getVal(thread, this.query.thumb, 'src'),
      subject: this._getVal(thread, this.query.subject, 'innerText'),
      post: this._getVal(thread, this.query.post, 'innerText').replace(/(\r\n|\n|\r)/gm, ' ').substr(0, MAX_OPPOST_LENGTH),
      created: this._parseDate(this._getTextNode(thread, this.query.created)),
      bumped: this._parseDate(this._getTextNode(thread, this.query.bumped, true)),
      replies: this._getQuantity(thread, this.query.replies),
      images: this._getQuantity(thread, this.query.images)
    };
    return result;
  }

  parseThread(html) {
    const parser = new DOMParser();
    const thread = parser.parseFromString(html, "text/html");
    return this._parse(thread);
  }
}

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

class _410chanThreadParser extends ThreadParser {
  constructor() {
    super();
    this.query = {
      id: '#delform a[name]:not(:first-child)',
      thumb: '#delform img.thumb',
      subject: '#delform > div > label > .filetitle',
      post: '#delform > div > .postbody > blockquote, #delform > div > blockquote',
      created: '#delform a + label', created2: '#delform a + label > .time',
      bumped: '#delform > div > a + label', bumped2: '#delform div > a + label > .time',
      replies: '#delform .reply',
      images: '#delform img.thumb'
    };
    this.rDate = /(\d{2})\.(\d{2})\.(\d{4})\D*(\d{2}\:\d{2}\:\d{2})/;  // 22.04.2017 (Сб) 05:49:58
  }

  _parseDate(text) {
    if (!text) {
        return 0;
      }
      const matches = text.match(this.rDate);
      if (!matches) {
        return 0;
      }
      // 2017-07-08T18:06:00
      return Date.parse(`${matches[3]}-${matches[2]}-${matches[1]}T${matches[4]}`) || 0;
  }

  _parse(thread) {
    const result = {
      id: this._getVal(thread, this.query.id, 'name'),
      thumb: this._getVal(thread, this.query.thumb, 'src'),
      subject: this._getVal(thread, this.query.subject, 'innerText'),
      post: this._getVal(thread, this.query.post, 'innerText').replace(/(\r\n|\n|\r)/gm, ' ').substr(0, MAX_OPPOST_LENGTH),
      created: this._parseDate(this._getTextNode(thread, this.query.created)) || this._parseDate(this._getTextNode(thread, this.query.created2)),
      bumped: this._parseDate(this._getTextNode(thread, this.query.bumped, true)) || this._parseDate(this._getTextNode(thread, this.query.bumped2, true)),
      replies: this._getQuantity(thread, this.query.replies),
      images: this._getQuantity(thread, this.query.images)
    };
    return result;
  }
}

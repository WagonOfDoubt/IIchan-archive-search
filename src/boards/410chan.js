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
      const year = matches[3];
      const month = (matches[2] || '0').padStart(2, '0');
      const day = (matches[1] || '0').padStart(2, '0');
      const time = (matches[4] || '00:00');
      // 2017-07-08T18:06:00
      const dateStr = `${year}-${month}-${day}T${time}`;
      return Date.parse(dateStr) || 0;
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


class _410chan extends BaseBoard {
  constructor() {
    super('410chan', {
      threadParser: new _410chanThreadParser(),
      styleCookie: 'kustyle',
      defaultStyle: 'Umnochan',
    });
  }

  constructPage(stats) {
    document.head.insertAdjacentHTML('beforeend', `
      //=include ../html/410chan.head.html
      `);
    super.constructPage(stats);
  }
}

imageboards['410chan.org'] = _410chan;

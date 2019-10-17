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
    const year = (matches[1] || '0').padStart(2, '0');
    const month = (matches[2] || '0').padStart(2, '0');
    const day = (matches[3] || '0').padStart(2, '0');
    const time = (matches[4] || '00:00');
    // 2017-07-08T18:06:00
    return Date.parse(`20${year}-${month}-${day}T${time}`) || 0;
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

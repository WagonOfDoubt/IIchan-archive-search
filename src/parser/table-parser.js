class TableParser {
  constructor() {

  }

  _parseRow(row) {
    const COL = {
      'name': 1,
      'modified': 2,
      'size': 3
    };
    const cols = row.querySelectorAll('td');
    if (cols.length < 5) {
      return null;
    }
    const el_link = cols[COL.name].querySelector('a');
    if (!el_link || /[\-\+]/.test(el_link.textContent)) {
      return null;
    }
    const size = cols[COL.size].innerText;
    if (size === '-') {
      return null;
    }

    return {
      'url': el_link.href,
      'id': el_link.innerText.split('.')[0],
      'year': cols[COL.modified].innerText.match(/\d{4}/)[0]
    };
  }

  parseTable(callback) {
    const table = document.querySelector('table');
    const rows = table.querySelectorAll('tr');
    for (let row of rows) {
      let thread = this._parseRow(row);
      if (thread) {
        callback(thread);
      }
    }
  }
}

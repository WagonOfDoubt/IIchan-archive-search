class Storage {
  constructor(board) {
    this.localArchive = Storage.load();
    if (!(board in this.localArchive)) {
      this.localArchive[board] = {};
    }
    this.boardArchive = this.localArchive[board];
    this.threadsSaved = Object.keys(this.boardArchive).length;
  }

  addThread(thread) {
    this.boardArchive[thread.id] = thread;
    Storage.save(this.localArchive);
  }

  getThread(threadId) {
    return this.boardArchive[threadId];
  }

  static load() {
    return JSON.parse(window.localStorage.getItem(LOCALSTORAGE_KEY) || '{}');
  }

  static save(object) {
    window.localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(object));
  }
}

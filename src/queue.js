class UpdateQueue {
  constructor(storage, callback) {
    this.storage = storage;
    this.threadLoadedCallback = callback;
    this.queue = [];
    this.isRunning = false;
    this._pendingXHR = null;
  }

  start() {
    this.isRunning = this.queue.length > 0;
    if (this.isRunning) {
      this.loadThread(this.queue.pop());
    }
  }

  stop() {
    this.isRunning = false;
    if (this._pendingXHR) {
      this._pendingXHR.abort();
      this._pendingXHR = null;
    }
  }

  clear() {
    this.stop();
    this.queue.length = 0;
  }

  add(threads) {
    this.queue.push.apply(this.queue, threads);
  }

  get size() {
    return this.queue.length;
  }

  loadThread(threadId) {
    const savedThread = this.storage.getThread(threadId);
    if (savedThread) {
      if (this.threadLoadedCallback) {
        this.threadLoadedCallback(savedThread);
      }

      if (this.queue.length > 0) {
        this.loadThread(this.queue.pop());
      } else {
        this.stop();
      }
    } else {
      const url = `${ window.location.origin }${ window.location.pathname }${ threadId }.html`;
      this.loadDoc(url);
    }
  }

  loadDoc(url) {
    const xhr = new XMLHttpRequest();
    const self = this;
    xhr.onload = function() {
      if (self._pendingXHR === xhr) {
        self._pendingXHR = null;
      }
      if (this.status == 200) {
        self.onThreadLoaded(this.response);
      } else {
        // reject(this.stats);
      }
    };
    xhr.onerror = function() {
      if (self._pendingXHR === xhr) {
        self._pendingXHR = null;
      }
      // reject(this.stats);
    };
    self._pendingXHR = xhr;
    xhr.open("GET", url, true);
    xhr.send();
  }

  onThreadLoaded(response) {
    const newThread = ThreadParser.parseThread(response);
    this.storage.addThread(newThread);
    if (this.threadLoadedCallback) {
      this.threadLoadedCallback(newThread);
    }

    if (this.queue.length > 0) {
      this.loadThread(this.queue.pop());
    } else {
      this.stop();
    }
  }
}

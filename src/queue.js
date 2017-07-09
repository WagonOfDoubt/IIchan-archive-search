class UpdateQueue {
  constructor(storage, parser, callback) {
    this.storage = storage;
    this.parserCallback = parser;
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

  loadThread(thread) {
    const savedThread = this.storage.getThread(thread.id);
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
      this.loadDoc(thread.url);
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
        self.onThreadLoaded(this.response, url);
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

  onThreadLoaded(response, url) {
    const thread = this.parserCallback(response);
    thread.url = url;

    if (this.threadLoadedCallback) {
      this.threadLoadedCallback(thread);
    }

    if (this.queue.length > 0) {
      this.loadThread(this.queue.pop());
    } else {
      this.stop();
    }
  }
}

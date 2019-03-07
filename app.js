const path = require('path');

const state = {
  server: null,
  sockets: [],
};

function start() {
  state.server = require('./server')().listen(3000, () => {
    console.log('Started on 3000');
  });
  state.server.on('connection', (socket) => {
    console.log('Add socket', state.sockets.length + 1);
    state.sockets.push(socket);
  });
}

function pathCheck(id) {
  return (
    id.startsWith(path.join(__dirname, 'routes')) ||
    id.startsWith(path.join(__dirname, 'server.js'))
  );
}

function restart() {
  // clean the cache
  Object.keys(require.cache).forEach((id) => {
    if (pathCheck(id)) {
      console.log('Reloading', id);
      delete require.cache[id];
    }
  });

  state.sockets.forEach((socket, index) => {
    console.log('Destroying socket', index + 1);
    if (socket.destroyed === false) {
      socket.destroy();
    }
  });

  state.sockets = [];

  state.server.close(() => {
    console.log('Server is closed');
    console.log('\n----------------- restarting -------------');
    start();
  });
}

start();

const chokidar = require('chokidar');
chokidar.watch(['./routes','./server.js']).on('all', (event, at) => {
  if (event === 'add') {
    console.log('Watching for', at);
  }

  if (event === 'change') {
    console.log('Changes at', at);
    restart();
  }
});

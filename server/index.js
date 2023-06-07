const express = require('express');
const app = express();
const fs = require('fs');
const open = require('open');
const options = {
  key: fs.readFileSync('./fake-keys/privatekey.pem'),
  cert: fs.readFileSync('./fake-keys/certificate.pem'),
};
const serverPort = process.env.PORT || 4443;
const https = require('https');
const http = require('http');
let server;
if (process.env.LOCAL) {
  server = https.createServer(options, app);
} else {
  server = http.createServer(app);
}

const io = require('socket.io')(server);

/* ==============================
 Middleware
 ================================ */
app.use(express.static(__dirname + '/public'));
app.get('/', getCallback);
io.on('connection', ioCallback);
server.listen(serverPort, listenCallback);

/* ==============================
 Middleware Functions
 ================================ */
function getCallback(req, res) {
  console.log('get /');
  res.sendFile(__dirname + '/index.html');
}

function listenCallback() {
  console.log('server up and running at %s port', serverPort);
  if (process.env.LOCAL) {
    open('https://localhost:' + serverPort);
  }
}

function ioCallback(socket) {
  console.log(`Socket id: ${socket.id}`);

  socket.on('join', (roomID, callback) => {
    console.log('join', roomID);

    let socketIds = socketIdsInRoom(roomID);
    callback(socketIds);

    socket.join(roomID);
    socket.room = roomID;

    io.in(roomID).emit('join', socket.id);
  });

  socket.on('exchange', data => {
    console.log('exchange', data);
    // console.log(
    //   '🚀 ~ file: index.js:63 ~ ioCallback ~ io.sockets:',
    //   io.sockets,
    // );

    data.from = socket.id;
    // let to = io.sockets.sockets.get(data.to);
    // console.log('🚀 ~ file: index.js:67 ~ ioCallback ~ to:', to);
    io.to(data.to).emit('exchange', data);
  });

  socket.on('disconnect', () => {
    console.log('disconnect');

    if (socket.room) {
      let room = socket.room;
      io.to(room).emit('leave', socket.id);
      socket.leave(room);

      console.log('leave');
    }
  });
}

/* ==============================
 Socket Functions
 ================================ */
function socketIdsInRoom(roomID) {
  console.log('🚀 ~ file: index.js:82 ~ socketIdsInRoom ~ roomID:', roomID);
  let socketIds = io.of('/').adapter.rooms.get(roomID);
  console.log(
    '🚀 ~ file: index.js:84 ~ socketIdsInRoom ~ socketIds:',
    socketIds,
  );
  console.log(
    '🚀 ~ file: index.js:83 ~ socketIdsInRoom ~ io:',
    io.of('/').adapter.rooms.get(roomID),
  );
  if (socketIds) {
    let collection = Array.from(socketIds);
    // for (let key in socketIds) {
    // console.log('🚀 ~ file: index.js:91 ~ socketIdsInRoom ~ key:', key);
    // collection.push(key);
    // }
    return collection;
  } else {
    return [];
  }
}

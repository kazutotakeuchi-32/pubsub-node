'use strict';

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const Redis = require('ioredis');
const app = express();

app.use(express.static('public'));
const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

const redis = new Redis('redis');
const client = new Redis('redis');

server.on('upgrade', function (request, socket, head) {
  wss.handleUpgrade(request, socket, head, function (ws) {
      wss.emit('connection', ws, request);
  });
});

function subscribeMessage(channel) {
  client.subscribe(channel);
  client.on('message', function(channel, message) {
    console.log(message,"se");
    broadcast(JSON.parse(message))
  });
}
subscribeMessage('newMessage')

// broadcast message to all clients
function broadcast(message){
  // ここでチャンネルの全てのユーザ宛てにメッセージを送信している
  console.log(wss.clients);
  wss.clients.forEach(function(client){
    client.send(JSON.stringify({
        message: message
    }))
  })
}

wss.on('connection', function (ws, request) {

  ws.on('message', function (message) {
    // ここでredisサーバにメッセージを送っている
    console.log(message,"server");
    redis.publish('newMessage', JSON.stringify(message))
  });

  ws.on('close', function (code, reason) {
    console.log('Client connection closed. (Code: %s, Reason: %s)', code, reason)
  });

  ws.on('error', function(error) {
    console.log('Client connection errored (%s)', error)
  })
});

const port = 3000;
server.listen(port, function () {
  console.log('Server start...');
});


// 1.まず、サーバを立ち上げと同時でnewMessageというチャンネルをsubしておく(サーバーサイド)
// 2.ユーザ１がメッセージを送信。(クライアントの処理)
// 3.44行目でイベントを検知、redisサーバにメッセージをpubする。(サーバーサイド)
// 4.１でsubしているので、チャンネル内にメッセージが送られてくる事を検知できる。(サーバーサイド)
// 5.その後、チャンネルを購読しているユーザにメッセージをブロードキャストする。(サーバーサイド)
// 6.サーバーから送られてきたmessesをonmessageイベントで検知、最終的に対象のdom要素にデータを追加

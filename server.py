# -*- coding: utf-8 -*-

import json

import tornado.ioloop
import tornado.web
import tornado.gen
import tornadoredis
import sockjs.tornado


class IndexHandler(tornado.web.RequestHandler):
    """Template renderer"""

    def get(self, *args, **kwargs):
        self.render('static/index.html')


class SocketConnection(sockjs.tornado.SockJSConnection):

    clients = set()

    def on_open(self, request):
        self.clients.add(self)

        self.redis = tornadoredis.Client(selected_db=6)
        self.redis.connect()

        self.redis.keys('*', self._keys_callback)

    def _keys_callback(self, response):
        if response:
            self.redis.mget(response, self._init_callback)

    def _init_callback(self, response):
        for message in response:
            self.send(message)


    def on_message(self, message):
        message = json.loads(message)

        message['value'] = message['value'][:255]

        output = json.dumps(message)
        for client in self.clients:
            if client == self:
                continue

            client.send(output)

        self.redis.setex(message['id'], 60*3, output)

    def on_close(self):
        self.clients.remove(self)


if __name__ == '__main__':
    import logging
    logging.getLogger().setLevel(logging.DEBUG)

    SocketRouter = sockjs.tornado.SockJSRouter(SocketConnection, '/socket')

    urls = [
        (r'/', IndexHandler),
        (r'/static/(.*)', tornado.web.StaticFileHandler, {'path': 'static'}),
    ]

    app = tornado.web.Application(
        urls + SocketRouter.urls,
        debug=True,
        autoreload=True,
    )

    app.listen(8080)

    tornado.ioloop.IOLoop.instance().start()
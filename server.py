# -*- coding: utf-8 -*-

import json
import redis

import tornado.ioloop
import tornado.web
import sockjs.tornado


class IndexHandler(tornado.web.RequestHandler):
    """Template renderer"""

    def get(self, *args, **kwargs):
        self.render('static/index.html')


class SocketConnection(sockjs.tornado.SockJSConnection):

    clients = set()

    def on_open(self, request):
        self.clients.add(self)
        self.redis = redis.StrictRedis(db=6)
        keys = self.redis.keys()
        if keys:
            values = self.redis.mget(keys)
            for value in values:
                self.send(value)

    def on_message(self, message):
        data = json.loads(message)
        self.redis.setex(data['id'], 60*3, message)
        self.broadcast(self.clients, message)

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
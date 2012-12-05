'use strict';

function uuid() {
    var f = function () {
        return Math.floor(
            Math.random() * 0x10000 /* 65536 */
        ).toString(16);
    };

    return (
        f() + f() + "-" +
            f() + "-" +
            f() + "-" +
            f() + "-" +
            f() + f() + f()
        );
}

$(function() {
    var connection;
    var entries = {};
    var input = $('#input');

    $(window).click(function(event) {
        input.val('').css({
            top: event.pageY-10,
            left: event.pageX-15
        }).focus().attr('data-id', uuid());
    });

    input.keyup(function(event) {
        var self = $(this);
        connection.send(JSON.stringify({
            id: self.attr('data-id'),
            top: self.position().top,
            left: self.position().left+1,
            value: self.val()
        }));
    });

    input.blur(function(event) {
        event.preventDefault();
        var self = $(this);
        var text = self.val();
        if (text.length == 0)
            return;

        var id = self.attr('data-id');
        var container = $('<div/>').attr('id', id).text(text).css({
            top: self.position().top,
            left: self.position().left+1
        });
        $('body').append(container);
        var die = new Date().getTime() + 1000*60*3;
        entries[die] = id;
    });

    function connect() {
        connection = new SockJS('http://' + window.location.host + '/socket');

        connection.onclose = function() {
            window.setTimeout(connect, 500);
        };

        connection.onmessage = function(event) {
            var data = JSON.parse(event.data);
            var container = $('#'+data.id);
            if (container.length == 0) {
                container = $('<div/>').attr('id', data.id).css({
                    top: data.top,
                    left: data.left
                });
                $('body').append(container);
            }
            container.text(data.value);
        };
    }

    connect();

    window.setInterval(function() {
        var time = new Date().getTime();
        var id;
        for (var prop in entries) {
            if (entries.hasOwnProperty(prop)) {
                id = entries[prop];
                $('#'+id).remove();
                delete entries[prop];
            }
        }
    }, 1000);

});
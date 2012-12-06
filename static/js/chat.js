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
            value: self.val(),
            expires: new Date().getTime() + 1000*60*3
        }));
    });

    input.blur(function(event) {
        event.preventDefault();
        var self = $(this);
        var text = self.val();
        if (text.length == 0)
            return;

        var id = self.attr('data-id');

        if ($('#'+id).length > 0) // Dirty hack to prevent duplicates
            return;

        var container = $('<div/>').text(text).attr({
            'id': id
        }).css({
            top: self.position().top,
            left: self.position().left+1
        });
        $('body').append(container);
        entries[id] = new Date().getTime() + 1000*60*3;
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
                container = $('<div/>').attr({
                    'id': data.id
                }).css({
                    top: data.top,
                    left: data.left
                });
                $('body').append(container);
            }
            container.text(data.value);
            entries[data.id] = data.expires;
        };
    }

    window.setInterval(function() {
        var time = new Date().getTime();
        for (var id in entries) {
            if (entries.hasOwnProperty(id)) {
                if (time > entries[id]) {
                    $('#'+id).remove();
                    delete entries[id];
                }
            }
        }
    }, 1000);

    connect();

});
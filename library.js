(function() {
    "use strict";
    /* jshint indent: 4 */
    var	request = require('request'),
        async = module.parent.require('async'),
        winston = module.parent.require('winston'),
        S = module.parent.require('string'),
        meta = module.parent.require('./meta'),
        gifconvertRegex = /\.(gif)\b/g,
        Embed = {},
        cache, appModule;
    var getgifconvert = function(gifconvertKey, callback) {
        var gifconvertNum = gifconvertKey;
        request.get({
            url: 'http://upload.gifconvert.com/transcode?fetchUrl=' + gifconvertNum + '.gif'
        }, function (err, response, body) {
            if (!err && response.statusCode === 200) {
                var gifconvertData = JSON.parse(body);
                if (!gifconvertData) {
                    return callback(null, {});
                }
                console.log(gifconvertNum)
                callback(null, {
                    width: gifconvertData.width,
                    height: gifconvertData.height,
                    webmUrl: gifconvertData.webmUrl,
                    gifUrl: gifconvertData.gifUrl,
                    mp4Url: gifconvertData.mp4Url,
                    gfyId: gifconvertData.gfyId,
                    numFrames: gifconvertData.numFrames
                });
            } else {
                callback(err);
            }
        });
    };
    Embed.init = function(app, middleware, controllers, callback) {
        function render(req, res, next) {
            res.render('partials/gifconvert-block', {});
        }
        appModule = app;
        if ( callback )
        callback();
    };
    Embed.parse = function(raw, callback) {
        var gifconvertKeys = [],
            matches, cleanedText;
        cleanedText = S(raw).stripTags().s;
        matches = cleanedText.match(gifconvertRegex);
        if (matches && matches.length) {
            matches.forEach(function(match) {
                if (gifconvertKeys.indexOf(match) === -1) {
                    gifconvertKeys.push(match);
                }
            });
        }
        async.map(gifconvertKeys, function(gifconvertKey, next) {
            if (cache.has(gifconvertKey)) {
                next(null, cache.get(gifconvertKey));
            } else {
                getgifconvert(gifconvertKey, function(err, gifconvertObj) {
                    if (err) {
                        return next(err);
                    }
                    cache.set(gifconvertKey, gifconvertObj);
                    next(err, gifconvertObj);
                });
            }
        }, function(err, gifconvertinfo) {
            if (!err) {
// Filter
                gifconvertinfo = gifconvertinfo.filter(function(issue) {
                    return issue;
                });
                appModule.render('partials/gifconvert-block', {
                    gifconvertinfo: gifconvertinfo
                }, function(err, html) {
                    callback(null, raw += html);
                });
            } else {
                winston.warn('Couldn\'t Filter gifconvertinfo');
                callback(null, raw);
            }
        });
    };
// Initial setup
    cache = require('lru-cache')({
        maxAge: 1000*60*60*24,
        max: 100
    });
    module.exports = Embed;
})();
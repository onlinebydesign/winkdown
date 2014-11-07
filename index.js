var async = require('async');
var request = require('request');
var fs = require('fs');
var path = require('path');
var url = require('url');
var cookieJar = request.jar();
//request = request.defaults({jar: cookieJar});
var cheerio = require('cheerio');
//var cookiejar = require('cookiejar');
var credentials = require('./credentials'); // Rename credentials.copy.js to credentials.js and adjust the values

var viewState = '';
var eventValidation = '';
var baseUrl = 'http://www.winkflash.com';

var headers = {
    'Cache-Control': 'max-age=0',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Origin': baseUrl,
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/37.0.2062.120 Chrome/37.0.2062.120 Safari/537.36',
    'Content-Type': 'application/x-www-form-urlencoded',
    'Referer': baseUrl + '/photo/signin.aspx',
    'Accept-Encoding': 'gzip,deflate',
    'Accept-Language': 'en-US,en;q=0.8'
};

var folderQueue = async.queue(function (folderHref, callback) {
    // Create a DOM object
    request({
        method: 'GET',
        uri: baseUrl + '/photo/' + folderHref,
        jar: cookieJar,
        headers: headers,
        followAllRedirects: true
    }, function (err, response, body) {
        if (!err) {
            // Create a DOM object
            //console.log(body);
            var $ = cheerio.load(body);
            $('a[id^=ctl00_ContentPlaceHolder1_ct]').each(function (i, e) {
                var href = e.attribs.href;
                console.log(href);
                if (href.indexOf('folder') !== -1) {
                    folderQueue.push(href);
                } else {
                    fileQueue.push(href.substr(href.indexOf('?')).replace('ic', 'c').replace('m', 'i'));
                }
            });

            callback(null);
        } else {
            callback(err);
        }
    });
}, 2);

var fileQueue = async.queue(function (fileHref, callback) {
    var req = request({
        method: 'GET',
        uri: baseUrl + '/photo/imagew1.aspx' + fileHref,
        jar: cookieJar,
        headers: headers,
        followAllRedirects: true
    }).on('response', function (response, err) {
        if (!err) {
            // Create a DOM object
            //console.log(body);
            var filename,
                contentDisp = response.headers['content-disposition'];
            if (contentDisp && /^attachment/i.test(contentDisp)) {
                filename = contentDisp.toLowerCase()
                    .split('filename=')[1]
                    .split(';')[0]
                    .replace(/"/g, '');
            } else {
                console.log(response);
                filename = path.basename(url.parse(baseUrl + '/photo/imagew1.aspx' + fileHref).path);
            }
            console.log(filename);
            req.pipe(fs.createWriteStream(path.join(__dirname, filename)));

            callback(null);
        } else {
            callback(err);
        }
    });
}, 2);

var splitCookies = function (headers) {
    if (headers['set-cookie']) {
        var setCookies = headers['set-cookie'];
        for (var i = 0; i < setCookies.length; i++) {
            var splitCookie = setCookies[i];
            //for (var j = 0; j < splitCookie.length; j++) {
            cookieJar.setCookie(request.cookie(splitCookie), baseUrl, function (err, cookie) {
                if (err) {
                    return console.error('signin failed:', err);
                }
            });

            //}
        }
    }
};

async.series([
    function (callback) {
        // Get the viewState, eventValidation, and cookies
        request(baseUrl + '/photo/signin.aspx', function (err, response, body) {
            if (!err) {
                splitCookies(response.headers);
                var $ = cheerio.load(body);
                // Get the viewState
                viewState = $('#__VIEWSTATE').val();

                // Get the eventValidation
                eventValidation = $('#__EVENTVALIDATION').val();

                callback(null);
            }
        });
    },
    function (callback) {
        // Signin
        var formData = {
            __EVENTTARGET: '',
            __EVENTARGUMENT: '',
            __VIEWSTATE: viewState,
            'ctl00$ContentPlaceHolder1$siteid': 1,
            'ctl00$ContentPlaceHolder1$userid': credentials.username,
            'ctl00$ContentPlaceHolder1$password': credentials.password,
            __EVENTVALIDATION: eventValidation,
            'ctl00$ContentPlaceHolder1$Button1': 'Log+In'
        };
        //console.log(formData);

        request({
            method: 'POST',
            uri: baseUrl + '/photo/signin.aspx',
            form: formData,
            jar: cookieJar,
            headers: headers,
            followAllRedirects: true
        }, function (err, httpResponse, body) {
            if (err) {
                return console.error('signin failed:', err);
            }
            splitCookies(httpResponse.headers);
            //console.log('Server responded with:', body);
            callback(null);
        });
    },
    function (callback) {
        // Go to the home page and begin the recursive image scraping
        request({
            method: 'GET',
            uri: baseUrl + '/photo/myhome.aspx',
            jar: cookieJar,
            headers: headers,
            followAllRedirects: true
        }, function (err, response, body) {
            if (!err) {
                // Create a DOM object
                //console.log(body);
                var $ = cheerio.load(body);
                $('a[id^=ctl00_ContentPlaceHolder1_ct]').each(function (i, e) {
                    var href = e.attribs.href;
                    console.log(href);
                    folderQueue.push(href);
                });

                callback(null);
            }
        });
    }
]);

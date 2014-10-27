var async = require('async');
var request = require('request');
var cookieJar = request.jar();
//request = request.defaults({jar: cookieJar});
var cheerio = require('cheerio');
//var cookiejar = require('cookiejar');
var credentials = require('./credentials'); // Rename credentials.copy.js to credentials.js and adjust the values

var viewState = '';
var eventValidation = '';
var baseUrl =' http://www.winkflash.com/';

var folderQueue = async.queue(function (href, callback) {
    // Create a DOM object
    var $ = cheerio.load(body);
    $('a[id^=ctl00_ContentPlaceHolder1_ct]').each(function() {
        //if (this.href.indexOf('folder') !== -1)
            //add to folderQueue(this.href)
        //else
        //add to imageQueue(this.href)
        //folderQueue.push(this.href.substr(this.href.indexOf('?')));
    });
    console.log('loading: ' + href);
    callback();
}, 2);

var fileQueue = async.queue(function (task, callback) {
    console.log('hello ' + task.name);
    callback();
}, 2);


async.series([
    function(callback) {
        // Get the viewState, eventValidation, and cookies
        request(baseUrl + 'photo/signin.aspx', function(err, response, body) {
            if (!err) {
                var cookieSessionId = request.cookie(response.headers['set-cookie'][0]);
                cookieJar.setCookie(cookieSessionId, baseUrl);
                var $ = cheerio.load(body);
                // Get the viewState
                viewState = $('#__VIEWSTATE').val();

                // Get the eventValidation
                eventValidation = $('#__EVENTVALIDATION').val();

                callback(null);
            }
        });
    },
    function(callback) {
        // Signin
        var formData = {
            __EVENTTARGET: '',
            __EVENTARGUMENT: '',
            __VIEWSTATE: viewState,
            ctl00_ContentPlaceHolder1_siteid: 1,
            ctl00_ContentPlaceHolder1_userid: credentials.username,
            ctl00_ContentPlaceHolder1_password: credentials.password,
            __EVENTVALIDATION: eventValidation,
            ctl00_ContentPlaceHolder1_Button1: 'Log In'
        };

        request.post({url:baseUrl + 'photo/signin.aspx', formData: formData, jar: cookieJar}, function optionalCallback(err, httpResponse, body) {
            if (err) {
                return console.error('signin failed:', err);
            }
            console.log('Server responded with:', httpResponse, body);
            callback(null);
        });
    },
    function(callback) {
        // Go to the home page and begin the recursive image scraping
        request('http://www.winkflash.com/photo/myhome.aspx', function(err, response, body) {
            if (!err) {
                // Create a DOM object
                var $ = cheerio.load(body);
                $('a[id^=ctl00_ContentPlaceHolder1_ct]').each(function() {
                    folderQueue.push(this.href.substr(this.href.indexOf('?')));
                });

                callback(null);
            }
        });
    }
]);


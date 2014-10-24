var async = require('async');
var request = require('request');
var cheerio = require('cheerio');
//var cookiejar = require('cookiejar');
var credentials = require('./credentials'); // Rename credentials.copy.js to credentials.js and adjust the values

var viewState = '';
var eventValidation = '';





async.series([
    function(callback) {
        // Get the viewState, eventValidation, and cookies
        request('GET: http://www.winkflash.com/photo/signin.aspx', function(error, response, body) {
            if (!error) {
                // Get the viewState

                // Get the eventValidation

                // Get the cookies

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

        request.post({url:'http://www.winkflash.com/photo/signin_logout.aspx?p=logout.aspx', formData: formData}, function optionalCallback(err, httpResponse, body) {
            if (err) {
                return console.error('upload failed:', err);
            }
            console.log('Upload successful!  Server responded with:', httpResponse, body);
            //var $ = cheerio.load(body);
        });
    }
])

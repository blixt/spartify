'use strict';

var sp = getSpotifyApi();

exports.createEvent = createEvent;
exports.getEvents = getEvents;
exports.postToEvent = postToEvent;
exports.updateEvent = updateEvent;

function createEvent(title, description, location, time, cb) {
  graph('POST', 'me/events',
    {
      name: title,
      description: description,
      location: location,
      start_time: time
    },
    cb);
}

function getEvents(cb) {
  graph('me/events', cb);
}

function postToEvent(eventId, text, cb) {
  graph('POST', [eventId, 'feed'], {
      message: text
    }, cb);
}

function updateEvent(eventId, fields, cb) {
  graph('POST', eventId, fields, cb);
}

var token;
function getToken() {
  if (token) return token;
  token = localStorage.facebookToken;
  return token;
}

function graph() {
  var args = Array.prototype.slice.call(arguments);
  if (!getToken()) {
    sp.core.showAuthDialog(
      'https://www.facebook.com/dialog/oauth/?' +
      'client_id=373051182734312' +
      '&redirect_uri=http://www.spartify.com/' +
      '&scope=user_events,create_event' +
      '&response_type=token' +
      '&display=popup',
      'http://www.spartify.com/',
      {
        onSuccess: function(targetUrl) {
          localStorage.facebookToken = targetUrl.split('#')[1].split('&')[0].split('=')[1];
          graph.apply(null, args);
        }
      });
    return;
  }

  var method = 'GET', path, data = {}, cb;
  if (arguments.length == 2) {
    path = arguments[0];
    cb = arguments[1];
  } else if (arguments.length == 4) {
    method = arguments[0];
    path = arguments[1];
    data = arguments[2];
    cb = arguments[3];
  } else {
    console.warn('invalid arguments', arguments);
    return;
  }

  if (path instanceof Array) path = path.join('/');
  if (path[0] != '/') path = '/' + path;

  console.log(method, path, JSON.stringify(data));

  data.access_token = getToken();
  data.method = method.toLowerCase();

  $.ajax({
    url: 'https://graph.facebook.com' + path + '?callback=?',
    dataType: 'json',
    data: data,
    type: method,
    success: cb,
    error: function() {
      console.warn(path, arguments);
    }
  });
}

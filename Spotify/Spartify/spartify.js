'use strict';

sp = getSpotifyApi(1);

var m = sp.require('sp://import/scripts/api/models');
var ui = sp.require("sp://import/scripts/ui");
var dnd = sp.require('sp://import/scripts/dnd');

exports.init = init;

function createHandler(method, argNames, callback) {
	return function () {
		if (arguments.length - 2 != argNames.length) {
			console.error('Wrong number of arguments. Excepted: ' + argNames.join(', ') + ', onsuccess, onerror');
			return;
		}

		var args = {};
		for (var i = 0; i < argNames.length; i++) {
			args[argNames[i]] = JSON.stringify(arguments[i]);
		}
		var success = arguments[i], error = arguments[i + 1];

		$.getJSON('http://www.spartify.com/api/' + method, args, function (data) {
			if (data.status != 'success') {
				console.error('API call', method, 'failed:', data.response.type, data.response.message);
				if (error) error(data);
				return;
			}
			callback(data, success || $.noop, error || $.noop);
		});
	};
}

var api = {
	createParty: createHandler('start',
		[],
		function (data, success, error) {
			var res = data.response;
			if (res instanceof Array) {
				success({
					id: res[0],
					queue: []});
			} else {
				success(res);
			}
		}),
	joinParty: createHandler('join',
		['party_id'],
		function (data, success, error) {
			var res = data.response;
			if (!res) {
				error('That room doesn\'t exist');
			} else if (res instanceof Array) {
				success({
					guest: res[0],
					queue: res[1]});
			} else {
				success(res);
			}
		}),
	getTracks: createHandler('queue',
		['party_id', 'version'],
		function (data, success, error) {
			var res = data.response;
			if (res instanceof Array) {
				success({queue: res});
			} else {
				success(res);
			}
		}),
	pop: createHandler('pop',
		['party_id'],
		function (data, success, error) {
			success();
		}),
	vote: createHandler('vote',
		['party_id', 'user_id', 'track_uri'],
		function (data, success, error) {
			success();
		})
};

var el = {
	body: $('body'),
	createParty: $('#create-party'),
	leaveParty: $('#leave-party'),
	partyCode: $('#party-code'),
	qrCode: $('#qr-code'),
	queue: $('#queue'),
	queueHeader: $('.view-party h2'),
	search: $('#search'),
	searchResults: $('#search-results')
};

var currentTrack, playlist, queue, queueVersion;

function fillTrackList(element, tracks) {
	element.css('height', tracks.length * 50);

	var lis = element.children('li'), traversed = [];
	lis.removeClass('first last');
	for (var i = 0; i < tracks.length; i++) {
		var track = tracks[i],
			li = element.children('li[data-uri="' + track.uri + '"]');

		if (!track || !track.uri) {
			console.error('Broken track', track, tracks);
			return;
		}

		if (!li.length) {
			li = $('<li>')
				.data('track', track)
				.attr('data-uri', track)
				.append(
					$('<div class="cover">'),
					$('<span class="title">').text(track.title),
					$('<span class="artist">').text(track.artist),
					$('<span class="vote">+1</span>'))
				.appendTo(element);
				
			m.Track.fromURI(track.uri, function(t) {
				var cover = new ui.SPImage(t.data.album.cover);
				li.find(".cover").append(cover.node);
			});
		} else {
			traversed.push(li[0]);
		}

		if (i == 0) li.addClass('first');
		if (i == tracks.length - 1) li.addClass('last');

		li.css('top', i * 50);
	}
	lis.not(traversed).remove();
}

function vote(track) {
	api.vote(localStorage.partyCode, 'master' + localStorage.partyCode, track.uri,
		function () {
			queueVersion = undefined;
			deferGetTracks();
		},
		function () {
			queueVersion = undefined;
			deferGetTracks();
		});

	// Simulate the addition of the track to make UI feel snappier.
	for (var i = 0; i < queue.length; i++) {
		if (queue[i].uri == track.uri) return;
	}
	queue.push(track);
	fillTrackList(el.queue, queue);
	el.queueHeader.toggle(queue.length > 0);
}

function tracksCallback(data) {
	deferGetTracks(5000);

	// The API won't return any data if there was no update.
	if (!data) return;

	queue = data.queue;
	queueVersion = data.version;

	if (!playlist && queue.length) {
		playlist = new m.Playlist();
		playlist.add(queue[0].uri);
		m.player.play(playlist.get(0), playlist, 0);
	}

	el.queueHeader.toggle(queue.length > 0);
	fillTrackList(el.queue, queue);
}

var stopGetTracks, deferGetTracks;
(function () {
	var timeout;

	deferGetTracks = function (delay) {
		stopGetTracks();
		timeout = setTimeout(getTracks, delay || 150);
	}

	stopGetTracks = function () {
		clearTimeout(timeout);
	}
})();

function getTracks() {
	if (!localStorage.partyCode) return;

	api.getTracks(localStorage.partyCode, queueVersion,
		tracksCallback,
		null);
}

function enterParty(code) {
	el.queueHeader.hide();
	localStorage.partyCode = code;
	el.partyCode.text(localStorage.partyCode);
	el.qrCode.attr('src', 'https://chart.googleapis.com/chart?chs=100x100&cht=qr&chl=http://spartify.com/' + localStorage.partyCode);
	el.body.attr('id', 'view-party');

	playlist = null;

	getTracks();
}

function init() {
	el.createParty.click(function () {
		el.queue.empty();
		el.queue.css('height', 0);
		el.searchResults.empty();
		el.searchResults.css('height', 0);
		el.search.val('');
		el.partyCode.text('...');
		el.body.attr('id', 'view-party');
		api.createParty(
			function (data) {
				enterParty(data.id);
				tracksCallback(data);
			},
			function () {
				// TODO(blixt): Show an error.
			});
	});

	el.leaveParty.click(function () {
		playlist = null;
		localStorage.partyCode = '';
		el.body.attr('id', 'view-start');
	});

	// Search code.
	(function () {
		var query = '',
			counter = 0,
			timeout;

		function handleResults(tracks) {
			var list = [];
			for (var i = 0; i < tracks.length; i++) {
				if (i >= 5) break;

				var track = tracks[i];
				list.push({
					album: track.album.name,
					artist: getArtistNameList(track.artists),
					cover: track.album.cover,
					length: track.duration,
					title: track.name,
					uri: track.uri
				});
			}
			fillTrackList(el.searchResults, list);
		}

		function search() {
			counter++;
			sp.core.search("*" + query + "*", true, false, {
				onSuccess: (function (i) {
					return function (data) {
						if (counter > i) {
							// Another search is already in progress.
							return;
						}
						handleResults(data.tracks);
					};
				})(counter)
			});
		}

		function handler() {
			if (el.search.val() == query) return;
			query = el.search.val();

			clearTimeout(timeout);
			if (query) {
				timeout = setTimeout(search, 50);
			} else {
				el.searchResults.empty();
				el.searchResults.css('height', 0);
			}
		}

		el.search.on('change keydown keypress keyup', handler);
	})();

	$('.track-list li').live('click', function () {
		var li = $(this);

		// Limit clicking on an item to once per 1 sec.
		if (li.hasClass('voted')) return;
		li.addClass('voted');
		el.search.val('').focus();
		setTimeout(function () {
			el.searchResults.empty();
			el.searchResults.css('height', 0);

			li.removeClass('voted');
		}, 1000);

		vote(li.data('track'));
	});

	if (localStorage.partyCode) {
		enterParty(localStorage.partyCode);
	}

	sp.trackPlayer.addEventListener('playerStateChanged', function (e) {
		if (!e.data.curtrack || !playlist) return;

		if (currentTrack && currentTrack.uri == queue[0].uri) {
			while (playlist.length) playlist.remove(playlist.get(0));

			if (queue.length > 1) {
				console.log('BAM!', queue[1].title);
				playlist.add(queue[1].uri);
				m.player.play(playlist.get(0), playlist, 0);
			}

			api.pop(localStorage.partyCode, null, null);
		}

		currentTrack = m.player.track;
	});	
	
	
	var drop = document.querySelector(".drop-zone");
	drop.addEventListener("dragenter", function(e) {
		this.style.background = "#444444";
	}, false);
	
	drop.addEventListener("dragover", function(e) {
		e.preventDefault();
		e.dataTransfer.dropEffect = "copy";
		return false;
	}, false);
	
	drop.addEventListener("dragleave", function(e) {
		this.style.background = "inherit";
	}, false);
	
	drop.addEventListener("drop", function(e) {
		this.style.background = "inherit";
		var link = m.Link.fromURL(e.dataTransfer.getData("Text"));
		m.Playlist.fromURI(link.uri, function(p) {
			var ints = new Array();
			for (var i = 0; i < p.data.length; i++)
				ints.push(i);
			var i, j, k;
			var temp;
			for (i = 0; i < 20; i++) {
				for (j = 0; j < p.data.length; j++) {
					k = Math.floor(Math.random() * p.data.length);
					temp = ints[j];
					ints[j] = ints[k];
					ints[k] = temp;
				}
			}
			
			$.each(ints, function(index, value) {
				if (m.Link.getType(p.data.get(value)) != m.Link.TYPE.LOCAL_TRACK) {
					var t = p.data.get(value);
					setTimeout(function() {
						m.Track.fromURI(t, function(track) {
							vote(track);
						});
					}, index * 1000);
				}
			});
		});
	}, false);
}

function getArtistNameList(artists) {
	var a = artists[0].name.decodeForHTML();
	for (var j = 1; j < artists.length; j++) {
		a += ", " + artists[j].name.decodeForText();
	}
	
	return a;
}
var spartify = function () {
	// A mock API for testing.
	function MockApi() {
		this.mock_songs_ = [];
	}
	MockApi.prototype.createParty = function (cb) {
		console.log('MockApi: createParty');
		setTimeout(function () {
			cb('ABCDEFG1234');
		}, 300);
	};
	MockApi.prototype.joinParty = function (partyCode, cb) {
		console.log('MockApi: joinParty', partyCode);
		setTimeout(function () {
			cb({user_id: 'USERID123', songs: [
				{album: 'Test Album', artist: 'Test Artist', length: 100, title: 'Title #1', uri: 'abc'},
				{album: 'Test Album', artist: 'Test Artist', length: 100, title: 'Title #2', uri: 'def'}
			]});
		}, 300);
	};
	MockApi.prototype.getSongs = function (partyCode, cb) {
		console.log('MockApi: getSongs', partyCode);
		var t = this;
		setTimeout(function () {
			cb(t.mock_songs_);
		}, 300);
	};
	MockApi.prototype.pop = function (partyCode) {
		console.log('MockApi: pop', partyCode);
		var t = this;
		setTimeout(function () {
			cb(t.mock_songs_.unshift());
		}, 300);
	};
	MockApi.prototype.vote = function (partyCode, userId, uri, cb) {
		console.log('MockApi: vote', partyCode, userId, uri);
		var t = this;
		setTimeout(function () {
			var i;
			if (Math.random() < 0.3 && t.mock_songs_.length > 1) {
				i = Math.floor(Math.random() * (t.mock_songs_.length - 1));
				var song = t.mock_songs_[i];
				t.mock_songs_[i] = t.mock_songs_[i + 1];
				t.mock_songs_[i + 1] = song;
			}

			var add = true;
			for (i = 0; i < t.mock_songs_.length; i++) {
				if (t.mock_songs_[i] == uri) {
					add = false;
					break;
				}
			}
			if (add) t.mock_songs_.push({album: 'Test Album', artist: 'Test Artist', length: 100, title: 'Title', uri: uri});

			cb();
		}, 300);
	};


	// The real API.
	function Api() {
	}
	Api.createHandler = function (method, argNames, callback) {
		return function () {
			if (arguments.length - 1 != argNames.length) {
				console.error('Wrong number of arguments. Excepted: ' + argNames.join(', ') + ', callback');
				return;
			}

			var args = {};
			for (var i = 0; i < argNames.length; i++) {
				args[argNames[i]] = JSON.stringify(arguments[i]);
			}
			var cb = arguments[i];

			$.getJSON('/api/' + method, args, function (data) {
				if (data.status != 'success') {
					console.error('API call', method, args, 'failed:', data);
				}
				callback(data, cb);
			});
		};
	}
	Api.prototype.createParty = Api.createHandler('start',
		[],
		function (data, cb) {
			cb(data.response[0]);
		});
	Api.prototype.joinParty = Api.createHandler('join',
		['party_id'],
		function (data, cb) {
			if (!data.response) {
				console.error('Got empty response when joining party');
				return;
			}
			cb({user_id: data.response[0], songs: data.response[1]});
		});
	Api.prototype.getSongs = Api.createHandler('queue',
		['party_id'],
		function (data, cb) {
			cb(data.response);
		});
	Api.prototype.pop = Api.createHandler('pop',
		['party_id'],
		function (data, cb) {
			cb(data.response);
		});
	Api.prototype.vote = Api.createHandler('vote',
		['party_id', 'user_id', 'track_uri'],
		function (data, cb) {
			cb();
		});


	return {
		//api: new MockApi()
		api: new Api()
	};
}();

// Interface code.
(function () {
	var state = {}, timeout;

	function go(page) {
		currentPage = page;

		$('body').attr('id', 'p-' + page);
		$('button').attr('disabled', false);
		$(window).scrollTop(0);

		if (page != 'party') {
			clearTimeout(timeout);
			state = {};
		}
	}

	function fillSongList(list, songs) {
		list.css('height', songs.length * 50);

		var lis = list.children('li'), traversed = [];
		lis.removeClass('first last');
		for (var i = 0; i < songs.length; i++) {
			var song = songs[i],
				li = list.children('li[data-uri="' + song.uri + '"]');

			if (!song || !song.uri) {
				console.error('Broken song', song, songs);
				return;
			}

			if (!li.length) {
				li = $('<li>')
					.attr('data-uri', song.uri)
					.html(song.title + '<br>' + song.artist)
					.append('<button>+1</button>')
					.appendTo(list);
			} else {
				traversed.push(li[0]);
			}

			if (i == 0) li.addClass('first');
			if (i == songs.length - 1) li.addClass('last');

			li.css('top', i * 50);
		}
		lis.not(traversed).remove();
	}

	var container = $('#queue');
	function songsCallback(songs) {
		fillSongList(container, songs);

		clearTimeout(timeout);
		timeout = setTimeout(getSongs, 1000);
	}

	function vote(uri) {
		if (!uri) return;
		spartify.api.vote(state.partyCode, state.userId, uri, function () {});
	}
	
	function getSongs() {
		if (!state.partyCode) return;
		spartify.api.getSongs(state.partyCode, songsCallback);
	}

	function enterParty(code, userId) {
		state = {
			partyCode: code,
			userId: userId
		};

		$('#party-code').html('Party code is: <code>' + code + '</code>');
		go('party');

		getSongs();
	}

	function joinParty(code) {
		spartify.api.joinParty(code, function (data) {
			enterParty(code, data['user_id']);
			songsCallback(data['songs']);
		});
	}


	// Main page
	$('#start').click(function () {
		$('button').attr('disabled', true);
		$('#party-code').text('...');
		spartify.api.createParty(function (code) {
			history.pushState({page: 'party', partyCode: code}, null, '/' + code);
			enterParty(code, true);
		});
	});

	$('#go-join').click(function () {
		go('join');
		history.pushState({page: 'join'}, null, '/join');
	});

	// Party page
	$('.song-list button').live('click', function () {
		var uri = $(this).closest('li').data('uri');
		vote(uri);
	});

	(function () {
		var query = '',
			counter = 0,
			field = $('#search'),
			results = $('#results'),
			timeout;

		function handleResults(tracks) {
			var songs = [];
			for (var i = 0; i < tracks.length; i++) {
				if (i >= 5) break;

				var song = tracks[i];
				songs.push({
					album: song.album.name,
					artist: song.artists[0].name,
					length: song.length,
					title: song.name,
					uri: song.href
				});
			}
			fillSongList(results, songs);
		}

		function search() {
			counter++;
			$.getJSON('http://ws.spotify.com/search/1/track.json',
				{q: query},
				(function (i) {
					return function (data) {
						if (counter > i) {
							// Another search is already in progress.
							return;
						}
						handleResults(data.tracks);
					};
				})(counter));
		}

		function handler() {
			if (field.val() == query) return;
			query = field.val();

			clearTimeout(timeout);
			if (query) {
				timeout = setTimeout(search, 50);
			} else {
				results.empty();
				results.css('height', 0);
			}
		}

		field.on('change keydown keypress keyup', handler);
	})();

	// XXX: Remove this
	$('#temp-pop').click(function(){spartify.api.pop(state.partyCode, function(){});});

	// Generic
	$('.go-to-main').click(function () {
		go('main');
		history.pushState({page: 'main'}, null, '/');
	});


	switch (location.pathname) {
		case '/':
			go('main');
			break;
		case '/join':
			go('join');
			break;
		default:
			joinParty(location.pathname.substring(1));
			break;
	}

	$(window).on('popstate', function (e) {
		var state = e.originalEvent.state;
		if (!state) return;

		switch (state.page) {
			case 'join':
				go('join');
				break;
			case 'main':
				go('main');
				break;
			case 'party':
				$('button').attr('disabled', true);
				joinParty(state.partyCode);
				break;
		}
	});
})();

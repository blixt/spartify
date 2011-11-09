var spartify = function () {
	function Api() {}
	Api.createHandler = function (method, argNames, callback) {
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

			$.getJSON('/api/' + method, args, function (data) {
				if (data.status != 'success') {
					console.error('API call', method, 'failed:', data.response.type, data.response.message);
					if (error) error(data);
					return;
				}
				callback(data, success || $.noop, error || $.noop);
			});
		};
	}
	Api.prototype.createParty = Api.createHandler('start',
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
		});
	Api.prototype.joinParty = Api.createHandler('join',
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
		});
	Api.prototype.getSongs = Api.createHandler('queue',
		['party_id', 'version'],
		function (data, success, error) {
			var res = data.response;
			if (res instanceof Array) {
				success({queue: res});
			} else {
				success(res);
			}
		});
	Api.prototype.pop = Api.createHandler('pop',
		['party_id'],
		function (data, success, error) {
			success();
		});
	Api.prototype.vote = Api.createHandler('vote',
		['party_id', 'user_id', 'track_uri'],
		function (data, success, error) {
			success();
		});


	return {
		api: new Api()
	};
}();

// Interface code.
(function () {
	var partyCode, playing, queue, queueVersion;

	function clearState() {
		partyCode = null;
	}

	function setPartyCode(code) {
		partyCode = code;
	}

	function setIsMaster(code, flag) {
		localStorage[code + ':master'] = flag;
	}

	function setUserId(code, userId) {
		localStorage[code + ':userId'] = userId;
	}

	function getPartyCode() {
		return partyCode || null;
	}

	function getUserId(code) {
		if (!code) code = getPartyCode();
		return localStorage[code + ':userId'];
	}

	function isMaster(code) {
		if (!code) code = getPartyCode();
		return !!localStorage[code + ':master'];
	}

	// Custom pushState that also registers Google Analytics page views.
	pushState = function pushState(state, title, url) {
		var path = location.pathname;
		history.pushState(state, title, url);
		if (location.pathname != path) {
			_gaq.push(['_trackPageview', location.pathname]);
		}
	};

	function go(page) {
		switch (page) {
			case 'join':
				$('#join-party-code').val('').change();
				break;
			case 'party':
				$('#search').val('').change();
				break;
		}

		$('body').attr('id', 'p-' + page);
		$('button.nav').attr('disabled', false);
		$(window).scrollTop(0);

		if (page != 'party') {
			stopGetSongs();
			clearState();
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
					.data('song', song)
					.attr('data-uri', song.uri)
					.append(
						$('<span>').addClass('title').text(song.title),
						$('<span>').addClass('artist').text(song.artist),
						$('<button>+1</button>'))
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

	function play() {
		if (!queue.length) return;

		var song = queue[0];
		if (playing == song.uri) return;

		var duration = song.length * 1000 - 50,
			li = $('#queue li[data-uri="' + song.uri + '"]');

		setTimeout(function () {
			var ids = [];
			for (var i = 0; i < queue.length; i++) {
				ids.push(queue[i].uri.split(':')[2]);
			}
			var tracksetUri = 'spotify:trackset:Spartify:' + ids;
			console.log(tracksetUri);
			/*$('#open').attr('src', tracksetUri);*/
		}, duration - 5000);

		li.css('progress', 0);
		li.animate({progress: 100}, {
			duration: duration,
			step: function (now, fx) {
				var decl = '0, #ffa ' + now + '%, #ffe ' + now + '%';
				$(fx.elem)
					.css('background', 'linear-gradient(' + decl + ')')
					.css('background', '-moz-linear-gradient(' + decl + ')')
					.css('background', '-webkit-linear-gradient(' + decl + ')');
			},
			complete: function () {
				spartify.api.pop(getPartyCode(),
					function () {
						deferGetSongs();
					},
					null);
			}
		});

		playing = song.uri;
		if ($.browser.webkit) {
			$('#open').attr('src', playing);
		} else {
			location.href = playing;
		}
	}

	var container = $('#queue');
	function songsCallback(data) {
		deferGetSongs(5000);

		// The API won't return any data if there was no update.
		if (!data) return;
		queue = data.queue;
		queueVersion = data.version;

		$('#party-room h2').toggle(queue.length > 0);
		fillSongList(container, queue);

		if (isMaster()) play();
	}

	function vote(song) {
		spartify.api.vote(getPartyCode(), getUserId() || 'NO_USER_ID', song.uri,
			function () {
				queueVersion = undefined;
				deferGetSongs();
			},
			function () {
				queueVersion = undefined;
				deferGetSongs();
			});

		// Simulate the addition of the track to make UI feel snappier.
		for (var i = 0; i < queue.length; i++) {
			if (queue[i].uri == song.uri) return;
		}
		queue.push(song);
		fillSongList(container, queue);
		// TODO(blixt): Refactor away this duplicate code.
		$('#party-room h2').toggle(queue.length > 0);
	}

	var stopGetSongs, deferGetSongs;
	(function () {
		var timeout;

		deferGetSongs = function (delay) {
			stopGetSongs();
			timeout = setTimeout(getSongs, delay || 150);
		}

		stopGetSongs = function () {
			clearTimeout(timeout);
		}
	})();

	function getSongs() {
		var code = getPartyCode();
		if (!code) return;

		spartify.api.getSongs(code, queueVersion,
			songsCallback,
			null);
	}

	function enterParty(code, skipPush) {
		setPartyCode(code);

		if (!skipPush) {
			pushState({
					page: 'party',
					partyCode: code
				}, null, '/' + code);
		}

		$('#party-code').html('Party code is: <code>' + code + '</code>');
		go('party');
	}

	function joinParty(code, onerror, skipPush) {
		spartify.api.joinParty(code,
			function (data) {
				// TODO(blixt): We currently throw away a user id here. Improve API so we don't have to do that.
				if (!getUserId(code)) {
					setUserId(code, data.guest);
				}
				enterParty(code, skipPush);
				songsCallback(data);
			},
			onerror);
	}


	// Main page
	$('#start').click(function () {
		$('button.nav').attr('disabled', true);
		$('#party-code').text('...');
		spartify.api.createParty(
			function (data) {
				setIsMaster(data.id, true);
				enterParty(data.id);
				songsCallback(data);
			},
			function () {
				go('main');
			});
	});

	$('#go-join').click(function () {
		go('join');
		pushState({page: 'join'}, null, '/join');
	});

	// Join party page
	$('#join-party-code')
		.on('change keydown keypress keyup', function () {
			var value = $(this).val();
			if (value.toUpperCase() != value) {
				$(this).val(value = value.toUpperCase());
			}
			$(this)
				.removeClass('invalid')
				.toggleClass('good', value.length == 5)
				.toggleClass('error', /^.{6,}$|[^A-Z0-9]/.test(value));
		})
		.on('animationEnd mozAnimationEnd webkitAnimationEnd', function () {
			$(this).removeClass('invalid');
		});

	$('#join').click(function () {
		$('button.nav').attr('disabled', true);
		var button = $('#join-party-code');
		joinParty(button.val(),
			function () {
				$('button.nav').attr('disabled', false);
				button.removeClass('good').addClass('invalid');
			});
	});

	// Party page
	$('.song-list button').live('click', function () {
		var song = $(this).closest('li').data('song');
		vote(song);
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

	// Generic
	$('.go-to-main').click(function () {
		go('main');
		pushState({page: 'main'}, null, '/');
	});


	switch (location.pathname) {
		case '/':
			go('main');
			break;
		case '/join':
			go('join');
			break;
		default:
			joinParty(location.pathname.substring(1),
				function () {
					go('main');
					pushState({page: 'main'}, null, '/');
				});
			break;
	}

	$(window).on('popstate', function (e) {
		var s = e.originalEvent.state;
		if (!s) return;

		switch (s.page) {
			case 'join':
				go('join');
				break;
			case 'main':
				go('main');
				break;
			case 'party':
				$('button.nav').attr('disabled', true);
				joinParty(s.partyCode,
					function () {
						$('button.nav').attr('disabled', false);
						pushState({page: 'main'}, null, '/');
					}, true);
				break;
		}
	});
})();

var spartify = function () {
	// A mock API for testing.
	function MockApi() {
		this.mock_songs_ = [];
	}
	MockApi.prototype.createParty = function (cb) {
		setTimeout(function () {
			cb('ABCDEFG1234');
		}, 300);
	}
	MockApi.prototype.getSongs = function (party, cb) {
		setTimeout(function () {
			cb(this.mock_songs_);
		}, 300);
	}
	MockApi.prototype.vote = function (party, song, cb) {
		setTimeout(function () {
			if (Math.random() < 0.3 && this.mock_songs_.length > 1) {
				var i = Math.floor(Math.random() * (this.mock_songs_.length - 1));
				var song = this.mock_songs_[i];
				this.mock_songs_[i] = this.mock_songs_[i + 1];
				this.mock_songs_[i + 1] = song;
			}
			cb(this.mock_songs_);
		}, 300);
	}

	// The real API.
	function Api() {
	}
	Api.prototype.getSongs = function (party, cb) {
		$.getJSON('/api/get_songs', {party: '"' + party + '"'}, cb);
	}

	/*
	 * === Interface code. ===
	 */
	var partyCode = null;

	function go(page) {
		$('body').attr('id', 'p-' + page);
		$(window).scrollTop(0);
	}

	var timeout, container = $('#songs');
	function songsCallback(songs) {
		container.css('height', songs.length * 40);

		var traversed = [];
		for (var i = 0; i < songs.length; i++) {
			var uri = songs[i],
				li = container.children('li[data-uri="' + uri + '"]');

			if (!li.length) {
				li = $('<li>')
					.attr('data-uri', uri)
					.text(uri)
					.appendTo(container);
			} else {
				traversed.push(li);
			}

			li.css('top', i * 40);
		}
		container.children('li').not(traversed).remove();

		timeout = setTimeout(getSongs, 1000);
	}

	function getSongs() {
		if (!partyCode) return;
		spartify.api.getSongs(partyCode, songsCallback);
	}

	function enterParty(code) {
		clearTimeout(timeout);

		partyCode = code;
		$('#party-code').html('Party code is: <strong>' + code + '</strong>');
		go('party');
	}

	$('#start').click(function () {
		$('#party-code').text('...');
		spartify.api.createParty(function (code) {
			history.pushState({page: 'party', partyCode: code}, null, code);
			enterParty(code);
		});
	});

	$('#go-join').click(function () {
		go('join');
		history.pushState({page: 'join'}, null, 'join');
	});

	$('.go-to-main').click(function () {
		go('main');
		history.pushState({page: 'main'}, null, '');
	});


	switch (location.pathname) {
		case '/':
			break;
		case '/join':
			go('join');
			break;
		default:
			enterParty(location.pathname.substring(1));
			break;
	}


	return {
		api: new MockApi()
	};
}();

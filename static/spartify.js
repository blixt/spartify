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
	}
	MockApi.prototype.getSongs = function (party, cb) {
		console.log('MockApi: getSongs', party);
		var t = this;
		setTimeout(function () {
			cb(t.mock_songs_);
		}, 300);
	}
	MockApi.prototype.vote = function (partyCode, uri, cb) {
		console.log('MockApi: vote', partyCode, uri);
		var t = this;
		setTimeout(function () {
			if (Math.random() < 0.3 && t.mock_songs_.length > 1) {
				var i = Math.floor(Math.random() * (t.mock_songs_.length - 1));
				var song = t.mock_songs_[i];
				t.mock_songs_[i] = t.mock_songs_[i + 1];
				t.mock_songs_[i + 1] = song;
			}
			t.mock_songs_.push(uri);
			cb(t.mock_songs_);
		}, 300);
	}


	// The real API.
	function Api() {
	}
	Api.prototype.getSongs = function (party, cb) {
		$.getJSON('/api/get_songs', {party: '"' + party + '"'}, cb);
	}


	return {
		api: new MockApi()
	};
}();

// Interface code.
(function () {
	var partyCode = null;

	function go(page) {
		$('body').attr('id', 'p-' + page);
		$('button').attr('disabled', false);
		$(window).scrollTop(0);

		if (page != 'party') {
			clearTimeout(timeout);
			partyCode = null;
		}
	}

	var timeout, container = $('#songs');
	function songsCallback(songs) {
		container.css('height', songs.length * 40);

		var lis = container.children('li'), traversed = [];
		for (var i = 0; i < songs.length; i++) {
			var uri = songs[i],
				li = container.children('li[data-uri="' + uri + '"]');

			if (!li.length) {
				li = $('<li>')
					.attr('data-uri', uri)
					.text(uri)
					.append('<button>+1</button>')
					.appendTo(container);
			} else {
				traversed.push(li[0]);
			}

			li.css('top', i * 40);
		}
		lis.not(traversed).remove();

		timeout = setTimeout(getSongs, 1000);
	}

	function vote(uri) {
		if (!partyCode) alert('vote without party?');
		clearTimeout(timeout);
		spartify.api.vote(partyCode, uri, songsCallback);
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

		getSongs();
	}


	// Main page
	$('#start').click(function () {
		$('button').attr('disabled', true);
		$('#party-code').text('...');
		spartify.api.createParty(function (code) {
			history.pushState({page: 'party', partyCode: code}, null, '/' + code);
			enterParty(code);
		});
	});

	$('#go-join').click(function () {
		go('join');
		history.pushState({page: 'join'}, null, '/join');
	});

	// Party page
	$('#add-song').click(function () {
		vote($('#search').val());
	});

	$('#songs button').live('click', function () {
		var uri = $(this).closest('li').data('uri');
		vote(uri);
	});

	// Generic
	$('.go-to-main').click(function () {
		go('main');
		history.pushState({page: 'main'}, null, '/');
	});


	go('main');
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

	$(window).bind('popstate', function (e) {
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
				enterParty(state.partyCode);
				break;
		}
	});
})();

var spartify = function () {
	function MockApi() {
		
	}
	MockApi.prototype.getSongs = function (cb) {
		setTimeout(function () {
			cb([
				'spotify:track:0FeE7oVZA3yJk3nqTTDgHm',
				'spotify:track:1JP779IkUMANQVaPGzc6Ld',
				'spotify:track:6oDO1FyjpbSln0vYWvyTST',
				'spotify:track:3R2GbvW4nga8i11gSwW2jV',
				'spotify:track:4IBF3hPcSLggvQGaafJvg4',
				'spotify:track:4R87pvIYJecbd8GBhkfhWd',
				'spotify:track:06Sb9v3YtFM0JPSBeAt7y1',
				'spotify:track:0l68zJYCC8XKawaj1rdhcb'
			]);
		}, 100);
	}


	return {
		api: new MockApi()
	};
}();

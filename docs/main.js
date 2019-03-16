(() => {

	// 準備
	const app = new PIXI.Application({width: 1600, height: 1200});

	window.addEventListener('DOMContentLoaded', () => {
		document.getElementById('canvas').appendChild(app.view);
	});

	// リソース読み込み
	const manifest = {
		'buri_hamachi': 'assets/mp3/buri_hamachi.mp3'
	};

	const loader = PIXI.loader;

	Object.entries(manifest).forEach(([key, value]) => {
		loader.add(key, value);
	});

	loader.load((loader, resources) => {
		// resources['buri_hamachi'].sound.play({loop: true, singleInstance: true});
	});

})();

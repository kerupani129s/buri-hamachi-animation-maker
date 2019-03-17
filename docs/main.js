(() => {

	const manifest = {
		'frame01': 'assets/png/test01.png',
		'frame02': 'assets/png/test02.png',
		'frame03': 'assets/png/test03.png',
		'frame04': 'assets/png/test04.png',
		'frame05': 'assets/png/test05.png',
		'frame06': 'assets/png/test06.png',
		'frame07': 'assets/png/test07.png',
		'frame08': 'assets/png/test08.png',
		'frame09': 'assets/png/test08.png',
		'buri_hamachi': 'assets/mp3/buri_hamachi.mp3'
	};

	const app = new PIXI.Application({width: 1600, height: 1200});

	window.addEventListener('DOMContentLoaded', () => {
		document.getElementById('canvas').appendChild(app.view);
	});

	/**
	 * 拍子単位でスプライトをアニメーションする
	 */
	const AnimatedSpriteByBeat = class extends PIXI.extras.AnimatedSprite {

		/**
		 * frames: {texture, note, bpm} の配列
		 * - note: 音符の長さ (単位: 拍子)
		 * - bpm: 省略可 (デフォルト: 120)
		 */
		constructor(frames) {

			let bpm = 120;

			const frameObjects = frames.map(frame => {

				const texture = frame.texture;

				if ( frame.bpm ) bpm = frame.bpm;
				const time = 60 / bpm * 4 * frame.note * 1000;

				return {texture, time};

			});

			super(frameObjects);

		}

	};

	/**
	 * リソース読み込みが完了したとき
	 */
	const loaded = (loader, resources) => {

		// 
		const music = resources['buri_hamachi'].sound;

		music.singleInstance = true;

		// テクスチャ名と音価と BPM の設定
		const frames = [];

		frames.push({name: 'frame01', note: 1 / 2, bpm: 140});
		frames.push({name: 'frame02', note: 1 / 2});
		for (let i = 0; i < 2; i++) {
			for (let j= 0; j < 8; j++) {
				frames.push({name: 'frame01', note: 1 / 4});
				frames.push({name: 'frame03', note: 1 / 4});
				frames.push({name: 'frame01', note: 1 / 4});
				frames.push({name: 'frame04', note: 1 / 4});
			}
			for (let j = 0; j < 3; j++) {
				frames.push({name: 'frame01', note: 1 / 2});
				frames.push({name: 'frame05', note: 1 / 2});
			}
			frames.push({name: 'frame06', note: 1 / 2});
			frames.push({name: 'frame07', note: 1 / 4});
			if ( i === 0 ) {
				frames.push({name: 'frame08', note: 1 / 4});
			} else {
				frames.push({name: 'frame09', note: 1 / 4});
			}
		}

		// 
		frames.forEach(frame => { frame.texture = resources[frame.name].texture; });

		const animation = new AnimatedSpriteByBeat(frames);

		animation.loop = false;

		app.stage.addChild(animation);

		// 
		window.addEventListener('click', () => {
			if ( animation.playing || music.isPlaying ) {
				animation.stop();
				music.stop();
			} else {
				animation.gotoAndPlay(0);
				music.play();
			}
		});

	};

	/**
	 * リソース読み込み
	 */
	const load = () => {

		const loader = PIXI.loader;

		Object.entries(manifest).forEach(([key, value]) => {
			loader.add(key, value);
		});

		loader.load(loaded);

	};

	// 
	load();

})();

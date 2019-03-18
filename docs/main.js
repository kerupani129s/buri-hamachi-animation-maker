(() => {

	let app;

	/**
	 * 初期化
	 */
	const init = () => {

		window.addEventListener('DOMContentLoaded', () => {

			app = new PIXI.Application({width: 1600, height: 1200});

			document.getElementById('canvas').appendChild(app.view);

			document.querySelector('#editor input[name="play"]').addEventListener('click', createAnimation);

		});

	};

	/**
	 * アニメーション作成
	 */
	const createAnimation = () => {

		const nodeList = document.querySelectorAll('#editor input[type="file"]');

		const files = [...nodeList].map(node => node.files[0]);

		if ( files.some(file => ! file) ) {
			alert('全てのファイルを選択してください');
			return;
		}

		const promises = files.map(file => {
			return new Promise(resolve => {
				const reader = new FileReader();
				reader.readAsDataURL(file);
				reader.onload = () => { resolve(reader.result); };
			});
		});

		// 
		Promise.all(promises).then(results => {

			const manifest = {
				'frame01': results[0],
				'frame02': results[1],
				'frame03': results[2],
				'frame04': results[3],
				'frame05': results[4],
				'frame06': results[5],
				'frame07': results[6],
				'frame08': results[7],
				'frame09': results[8],
				'buri_hamachi': 'assets/mp3/buri_hamachi.mp3'
			};

			load(manifest);

			document.getElementById('canvas').style.visibility = 'visible';

		});

	};

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

		// アニメーション
		frames.forEach(frame => { frame.texture = resources[frame.name].texture; });

		const animation = new AnimatedSpriteByBeat(frames);

		animation.loop = false;

		app.stage.addChild(animation);

		// 再生・停止・ループ
		const play = () => {
			const promise1 = new Promise(resolve => {
				animation.onComplete = resolve;
				animation.gotoAndPlay(0); // Note: play() では最初に戻らない
			});
			const promise2 = new Promise(resolve => {
				music.play(resolve);
			});
			Promise.all([promise1, promise2]).then(() => {
				play();
			});
		};

		window.addEventListener('click', () => {
			if ( animation.playing || music.isPlaying ) {
				animation.stop();
				music.stop();
			} else {
				play();
			}
		});

		play();

	};

	/**
	 * リソース読み込み
	 */
	const load = manifest => {

		const loader = PIXI.loader;

		Object.entries(manifest).forEach(([key, value]) => {
			loader.add(key, value);
		});

		loader.load(loaded);

	};

	// 
	init();

})();

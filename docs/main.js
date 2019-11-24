(() => {

	const APP_WIDTH = 1600;
	const APP_HEIGHT = 1200;

	const supportedVp8 = MediaRecorder.isTypeSupported('video/webm; codecs=vp8');

	let app;
	let recorder;

	/**
	 * 初期化
	 */
	const init = () => {

		app = new PIXI.Application({width: APP_WIDTH, height: APP_HEIGHT});

		document.getElementById('canvas').appendChild(app.view);

		document.querySelector('#editor input[name="play"]').addEventListener('click', createAnimation);

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

		// 
		const promises = files.map(file => {
			return new Promise(resolve => {
				const reader = new FileReader();
				reader.readAsDataURL(file);
				reader.onload = () => { resolve(reader.result); };
			});
		});

		promises.push(new Promise(resolve => {
			const music = document.getElementById('music');
			music.addEventListener('loadeddata', () => {
				if ( music.readyState >= 4 ) {
					resolve();
				}
			});
			if ( music.readyState >= 4 ) { // loadeddata イベントハンドラの設定前に読み込み終わっていた場合
				resolve();
			}
		}));

		// 
		Promise.all(promises).then(results => {

			// キャプチャー対象
			const videoElement = document.getElementById('canvas').firstChild;
			const audioElement = document.getElementById('music');

			const videoStream = ( 'captureStream' in videoElement ) ? videoElement.captureStream() : videoElement.mozCaptureStream();
			const audioStream = ( 'captureStream' in audioElement ) ? audioElement.captureStream() : audioElement.mozCaptureStream();

			const videoTrack = videoStream.getVideoTracks()[0];
			const audioTrack = audioStream.getAudioTracks()[0];

			const mediaStream = new MediaStream([videoTrack, audioTrack]);

			// レコーダー初期化
			if ( supportedVp8 ) {
				recorder = new MediaRecorder(mediaStream, {mimeType: 'video/webm; codecs=vp8'});
			} else {
				recorder = new MediaRecorder(mediaStream);
			}
			const chunks = [];

			recorder.ondataavailable = event => chunks.push(event.data);
			recorder.onstop = () => {
				const webm = new Blob(chunks, {'type' : (supportedVp8 ? 'video/webm; codecs=vp8' : 'video/webm')});
				const url = window.URL.createObjectURL(webm);
				const a = document.createElement('a');
				a.setAttribute('href', url);
				a.setAttribute('download', 'buri-hamachi.webm');
				a.click();
			};

			// 画像を PIXI に読み込み
			const manifest = {
				'frame01': results[0],
				'frame02': results[1],
				'frame03': results[2],
				'frame04': results[3],
				'frame05': results[4],
				'frame06': results[5],
				'frame07': results[6],
				'frame08': results[7],
				'frame09': results[8]
			};

			load(manifest);

			document.getElementById('canvas').style.visibility = 'visible';

		});

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

	/**
	 * リソース読み込みが完了したとき
	 */
	const loaded = (loader, resources) => {

		// 
		const music = document.getElementById('music');

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
		animation.scale.set(APP_WIDTH / animation.width);

		app.stage.addChild(animation);

		// 再生・停止・ループ
		const play = () => {
			recorder.start();
			const promise1 = new Promise(resolve => {
				animation.onComplete = resolve;
				animation.gotoAndPlay(0); // Note: play() では最初に戻らない
			});
			const promise2 = new Promise(resolve => {
				music.addEventListener('ended', resolve);
				music.currentTime = 0;
				music.play();
			});
			Promise.all([promise1, promise2]).then(() => {
				recorder.stop();
				play();
			});
		};

		app.stage.interactive = true;

		app.stage.on('pointertap', () => {
			if ( animation.playing || ! music.paused ) {
				animation.stop();
				music.pause();
				recorder.stop();
			} else {
				play();
			}
		});

		play();

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

	// 
	window.addEventListener('DOMContentLoaded', () => {
		init();
	});

})();

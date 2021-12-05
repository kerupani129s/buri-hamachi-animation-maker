(() => {

	const supportedVp8Opus = MediaRecorder.isTypeSupported('video/webm; codecs=vp8,opus');

	/**
	 * 
	 */
	const Application = class {

		constructor() {

			// フィールド
			// TODO: サイズ可変にすべき？
			this._width = 1600;
			this._height = 1200;

			this._screen = new AnimationScreen(this._width, this._height);
			this._bgm = new CapturableAudio('./assets/mp3/buri-hamachi.mp3');

			this._asyncCreateRecorder = this._bgm.asyncGetAudioTracks().then(audioTracks => {
				return new AnimationRecorder(this._screen.videoTracks[0], audioTracks[0]);
			});

			// 
			this._screen.stage.on('pointertap', () => {
				if ( this._animation.playing || ! this._bgm.paused ) {
					this._animation.stop();
					this._bgm.pause();
					this._recorder.stop();
				} else {
					this._playAnimation();
				}
			});

			document.querySelector('#editor input[name="play"]').addEventListener('click', () => { this._startCreatingAnimation(); });

		}

		_asyncLoadFilesForAnimation(dataURLs) {

			const manifest = {
				'frame01': dataURLs[0],
				'frame02': dataURLs[1],
				'frame03': dataURLs[2],
				'frame04': dataURLs[3],
				'frame05': dataURLs[4],
				'frame06': dataURLs[5],
				'frame07': dataURLs[6],
				'frame08': dataURLs[7],
				'frame09': dataURLs[8]
			};

			// TODO: loader を new した方が良い？
			const loader = PIXI.loader;

			Object.entries(manifest).forEach(([key, value]) => {
				loader.add(key, value);
			});

			return new Promise(resolve => {
				loader.load((loader, resources) => { resolve({loader, resources}); });
			});

		}

		_asyncReadFilesForAnimation(imageFiles) {

			const promises = imageFiles.map(file => {
				return new Promise(resolve => {
					const reader = new FileReader();
					reader.readAsDataURL(file);
					reader.onload = () => { resolve(reader.result); };
				});
			});

			promises.push(this._bgm.asyncCanPlayThrough());

			return Promise.all(promises);

		}

		_cannotAnimate(imageFiles) {
			return imageFiles.some(file => ! file);
		}

		_createAnimation({loader, resources}) {

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

			frames.forEach(frame => { frame.texture = resources[frame.name].texture; });

			// アニメーション
			this._animation = new AnimatedSpriteByBeat(frames, this._screen.application);

			this._animation.loop = false;
			this._animation.scale.set(this._width / this._animation.width);

			this._screen.stage.addChild(this._animation);

			if ( this._animation.onFrameChange ) {
				this._animation.onFrameChange();
			}

		}

		_getImageFiles() {
			const nodeList = document.querySelectorAll('#editor input[type="file"]');
			return [...nodeList].map(node => node.files[0]);
		}

		_playAnimation() {

			this._recorder.start();

			// 
			const promises = this._bgm.playFromBeginning();
			const startedAudio = promises.started;
			const endedAudio = promises.ended;

			startedAudio.then(() => {

				const endedVideo = new Promise(resolve => {
					this._animation.onComplete = resolve;
				});
				this._animation.gotoAndPlay(0);

				this._screen.stage.interactive = true;

				return Promise.all([endedVideo, endedAudio]);

			}).then(() => {
				this._screen.stage.interactive = false;
				this._recorder.stop();
				this._recorder.save();
			});

		}

		_startCreatingAnimation() {

			// 
			const imageFiles = this._getImageFiles();

			if ( this._cannotAnimate(imageFiles) ) {
				alert('全てのファイルを選択してください');
				return;
			}

			// 
			document.getElementById('screen').style.visibility = 'visible';

			this._asyncReadFilesForAnimation(imageFiles)
				.then(dataURLs => { return this._asyncLoadFilesForAnimation(dataURLs); })
				.then(({loader, resources}) => {
					this._createAnimation({loader, resources});
					// TODO: キャプチャーする設定のときのみにする
					return this._asyncCreateRecorder;
				}).then(recorder => {

					// レコーダー準備
					if ( ! recorder ) {
						window.alert('エラー: お使いの環境では動画保存未対応です。');
						return;
					}
					this._recorder = recorder;

					// 
					this._playAnimation();

				});

		}

	};

	/**
	 * アニメーション出力画面
	 */
	const AnimationScreen = class {

		constructor(width, height) {

			this._app = new PIXI.Application({width, height, autoStart: false});

			document.getElementById('screen').appendChild(this._app.view);

		}

		_captureStream() {

			const canvas = this._app.view;

			let captureStream;

			if ( 'captureStream' in canvas ) {
				captureStream = canvas.captureStream();
			} else if ( 'mozCaptureStream' in canvas ) {
				captureStream = canvas.mozCaptureStream();
				// ここでは音声がないので Firefox mozCaptureStream() 対策なし
			} else {
				console.log('Info: captureStream() is not supported');
			}

			return captureStream;

		}

		get application() {
			return this._app;
		}

		get stage() {
			return this._app.stage;
		}

		get videoTracks() {
			// return this._app.view.videoTracks; // Chrome 未対応、Firefox デフォルト設定で無効
			return this._captureStream().getVideoTracks();
		}

	};

	/**
	 * キャプチャー可能な音声
	 */
	const CapturableAudio = class {

		constructor(url) {

			// フィールド
			this._audio = new Audio(url);

			this._asyncCanPlayThrough = new Promise(resolve => {
				this._audio.addEventListener('canplaythrough', resolve);
			});

			this._asyncGetAudioTracks = new Promise(resolve => {
				this._audio.addEventListener('loadeddata', () => {
					resolve(this._audioTracks);
				});
			});

		}

		get _audioTracks() {
			// return this._audio.audioTracks; // Chrome 未対応、Firefox デフォルト設定で無効
			return this._captureStream().getAudioTracks();
		}

		_captureStream() {

			let captureStream;

			if ( 'captureStream' in this._audio ) {
				captureStream = this._audio.captureStream();
			} else if ( 'mozCaptureStream' in this._audio ) {
				captureStream = this._audio.mozCaptureStream();
				// Firefox mozCaptureStream() 対策
				const context = new AudioContext();
				const source = context.createMediaElementSource(this._audio);
				source.connect(context.destination);
				// 
			} else {
				console.log('Info: captureStream() is not supported');
			}

			return captureStream;

		}

		asyncCanPlayThrough() {
			return this._asyncCanPlayThrough;
		}

		asyncGetAudioTracks() {
			return this._asyncGetAudioTracks;
		}

		pause() {
			this._audio.pause();
		}

		get paused() {
			// メモ: Audio と Animation で playing の意味が異なる
			return this._audio.paused;
		}

		playFromBeginning() {

			this._audio.currentTime = 0;

			const ended = new Promise(resolve => {
				this._audio.addEventListener('ended', resolve);
			});
			const started = this._audio.play();

			return {started, ended};

		}

	};

	/**
	 * アニメーション・音声キャプチャー用レコーダー
	 */
	const AnimationRecorder = class {

		constructor(videoTrack, audioTrack) {

			// 動画と音声を合わせた新たなストリーム
			const mediaStream = new MediaStream([videoTrack, audioTrack]);

			// レコーダー初期化
			if ( supportedVp8Opus ) {
				this._recorder = new MediaRecorder(mediaStream, {mimeType: 'video/webm; codecs=vp8,opus'});
			} else {
				this._recorder = new MediaRecorder(mediaStream);
			}

			this._recorder.ondataavailable = event => { this._chunks.push(event.data); };

		}

		isNotSupported() {
			return ! this._recorder;
		}

		save() {

			this._asyncOnStop.then(() => {

				const webm = new Blob(this._chunks, {'type' : (supportedVp8Opus ? 'video/webm; codecs=vp8,opus' : 'video/webm')});
				const url = window.URL.createObjectURL(webm);
				const a = document.createElement('a');
				a.setAttribute('href', url);
				a.setAttribute('download', 'buri-hamachi.webm');
				a.click();

			});

		}

		start() {
			this._chunks = [];
			this._asyncOnStop = new Promise(resolve => {
				this._recorder.onstop = resolve;
			});
			this._recorder.start();
		}

		stop() {
			this._recorder.stop();
		}

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
		constructor(frames, app) {

			// 
			let bpm = 120;

			const frameObjects = frames.map(frame => {

				const texture = frame.texture;

				if ( frame.bpm ) bpm = frame.bpm;
				const time = 60 / bpm * 4 * frame.note * 1000;

				return {texture, time};

			});

			super(frameObjects);

			// フレームが変わった時のみ再描画
			this._app = app;

			this.onFrameChange = () => this._onFrameChange();

		}

		_onFrameChange() {
			this._app.render();
		}

	};

	// DOM が構築されたらアプリケーション初期化
	window.addEventListener('DOMContentLoaded', () => {
		new Application();
	});

})();

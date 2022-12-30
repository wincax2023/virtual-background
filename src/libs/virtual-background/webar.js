import { Player, Effect, /*MediaStreamCapture,*/ Webcam, Dom } from './lib/banuba/BanubaSDK';
import { BANUBA_CLIENT_TOKEN } from './lib/banuba/BanubaClientToken';
const IRtc = ivcs.IRtc;
let { LocalStream, /*MediaStreamFactory,*/ StreamSourceInfo } = IRtc.Base;

class WebarEffect {
	constructor() {
		this.player = null;
		this.streamEffect = null;
		this.videoHeight = 0;
		this.videoWidth = 0;
		this.stoped = false;
		this.image = new Image(428, 400); // Using optional size for image
	}

	async init() {
		if (!this.player) {
			this.player = await Player.create({
				clientToken: BANUBA_CLIENT_TOKEN,
				maxFaces: 1,
				locateFile: {
					'BanubaSDK.data': location.origin + location.pathname + 'static/banuba/BanubaSDK.data',
					'BanubaSDK.wasm': location.origin + location.pathname + 'static/banuba/BanubaSDK.wasm',
					'BanubaSDK.simd.wasm': location.origin + location.pathname + 'static/banuba/BanubaSDK.simd.wasm'
				},
				enableMirroring: true
			});
		}
	}

	async loadEffect() {
		if (!this.effect) {
			this.effect = await Effect.preload(location.origin + location.pathname + `static/effects/Makeup.zip`);
		}
	}

	/*创建本地媒体流带水印和背景*/
	async createCustomizedStream(options, resolution, frameRate, aitype, videoDeviceID = undefined, audioDeviceID = undefined) {
		if (!this.player) {
			await this.init();
		}
		if (!this.effect) {
			await this.loadEffect();
		}

		let audio = {};
		if (audioDeviceID && audioDeviceID.length > 0) {
			audio.deviceId = { exact: audioDeviceID };
		} else {
			audio = true;
		}

		let video = {
			width: resolution.width,
			height: resolution.height
		};
		if (videoDeviceID && videoDeviceID.length > 0) {
			video.deviceId = { exact: videoDeviceID };
		}
		let mediaStreamDeviceConstraints = {
			audio: audio,
			video: video
		};
		if (this.webcam) {
			this.webcam.start();
		} else {
			this.webcam = new Webcam(mediaStreamDeviceConstraints);
			this.player.use(this.webcam);
		}

		Dom.render(this.player, '#banubaCanvas');

		await this.player.play();

		await this.player.applyEffect(this.effect);

		return new Promise((resolve, reject) => {
			if (options.background.type === 'none' && !options.beauty.enable) {
				return resolve(null);
			}
			const self = this;
			setTimeout(() => {
				self.applyEffect(options);
			}, 3000);

			if (this.player && this.effect) {
				const canvas = document.getElementById('banubaCanvas').childNodes[0];
				this.streamEffect = canvas.captureStream(15);
				let videoSource = 'camera';
				let audioSource = 'mic';
				let streamSourceInfo = new StreamSourceInfo(audioSource, videoSource);
				this.customizedLocalStream = new LocalStream(this.streamEffect, streamSourceInfo, { type: aitype }, true);
				resolve({ customizedLocalStream: this.customizedLocalStream });
			} else {
				reject('create effect error');
			}
		});
	}

	applyEffect(options) {
		const { beauty, background } = options;

		if (background.type === 'none') {
			this.setEffect('BackgroundTexture.clear');
			this.setEffect('BackgroundBlur.disable');
		} else if (background.type === 'blur') {
			this.setEffect('BackgroundTexture.clear');
			this.setEffect('BackgroundBlur.enable', 'blur.png');
			this.setEffect('BackgroundTexture.setBGContentMode', 'aspect_fill');
			this.setEffect(background.api, background.value);
		} else if (background.type === 'image') {
			this.setEffect('BackgroundBlur.disable');
			this.setEffect(background.api, background.value);
			this.setEffect('BackgroundTexture.setBGContentMode', 'aspect_fill');
		}
		if (beauty && beauty.length > 0) {
			beauty.map(item => {
				if (item.enable) {
					this.setEffect(item.api, item.value);
				} else {
					if (item.apiClear) {
						this.setEffect(item.apiClear);
					} else {
						if (item.type === 'color') {
							this.setEffect(item.api, '0 0 0 0');
						} else if (item.type === 'number') {
							this.setEffect(item.api, '0');
						}
					}
				}
			});
		}
	}

	async createEffect(onPlayerReady) {
		this.stoped = false;
		if (!this.player) {
			await this.init();
		}
		// 	428 x 926
		if (this.webcam) {
			this.webcam.start();
		} else {
			this.webcam = new Webcam({ width: 428, height: 400 });
			this.player.use(this.webcam);
		}
		Dom.render(this.player, '#postprocessed');

		await this.player.play();
		if (!this.effect) {
			await this.loadEffect();
		}

		await this.player.applyEffect(this.effect);

		if (onPlayerReady) {
			onPlayerReady();
		}
	}

	setWatermarkPosType(type) {
		if (type < 1 || type > 6) {
			console.error('set watermark position error : type not in [1, 6] !');
			return;
		}
		this.updatePos();
		this.watermarkPos = this.positions[type];
	}
	setWatermark(image) {
		if (!image) {
			console.error('set watermark error : image is null !');
			return;
		}
		this.image.src = image;
	}
	setEffect(api, value) {
		if (!this.player) {
			// console.error('set effect error : player is null !');
			return;
		}
		if (!api || api.length <= 0) {
			console.error('set effect error : api is null !', api);
			return;
		}
		if (value && value.length > 0) {
			this.player.callJsMethod(api, value);
		} else {
			this.player.callJsMethod(api);
		}
	}

	updatePos() {
		this.positions[2] = { x: (this.videoWidth - 128) / 2, y: 0 };
		this.positions[3] = { x: this.videoWidth - 128, y: 0 };
		this.positions[4] = { x: 0, y: this.videoHeight - 32 };
		this.positions[5] = {
			x: (this.videoWidth - 128) / 2,
			y: this.videoHeight - 32
		};
		this.positions[6] = {
			x: this.videoWidth - 128,
			y: this.videoHeight - 32
		};
	}

	stopEffect() {
		Dom.unmount('#banubaCanvas');
		this.stoped = true;
		// cancelAnimationFrame(this.requestAF);
		if (this.player) {
			// this.player.pause();
			this.player.clearEffect();
			this.player = null;
		}
		if (this.streamEffect) {
			this.stopStream(this.streamEffect);
			this.streamEffect = null;
		}
		if (this.customizedLocalStream) {
			this.stopStream(this.customizedLocalStream);
			this.customizedLocalStream = null;
		}
		if (this.stream) {
			this.stopStream(this.stream);
			this.stream = null;
		}
		if (this.webcam) {
			this.webcam.stop();
			this.webcam = null;
		}
		if (this.capture) {
			this.stopStream(this.capture);
			this.capture = null;
		}
	}

	/**
	 * 停止当前视频流
	 * @param { Object } stream
	 * @returns { Object }  视频流
	 */
	stopStream(stream) {
		if (!stream) {
			return;
		}
		if (stream.mediaStream) {
			let oldVideoTracks = stream.mediaStream.getVideoTracks();
			let oldAudioTracks = stream.mediaStream.getAudioTracks();

			for (let track of oldVideoTracks) {
				track.stop();
			}
			for (let track of oldAudioTracks) {
				track.stop();
			}
		} else if (stream.getVideoTracks) {
			let oldVideoTracks = stream.getVideoTracks();
			let oldAudioTracks = stream.getAudioTracks();
			for (let track of oldVideoTracks) {
				track.stop();
			}
			for (let track of oldAudioTracks) {
				track.stop();
			}
		} else {
			let oldVideoTrack = stream.getVideoTrack();
			let oldAudioTrack = stream.getAudioTrack();
			if (oldVideoTrack) {
				oldVideoTrack.stop();
			}
			if (oldAudioTrack) {
				oldAudioTrack.stop();
			}
		}
	}
}

// const webarEffect = new WebarEffect();

export default WebarEffect;

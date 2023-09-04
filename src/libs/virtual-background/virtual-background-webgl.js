import { createVirtualBackgroundEffect } from './lib/virtual-background/index.js';
import {defaultMediaOptions} from '../config'
import {IRtc} from '../ivcs'
// const IRtc = ivcs.IRtc;
const { LocalStream, MediaStreamFactory, StreamSourceInfo } = IRtc.Base;


class VirtualBackgroundEffectGL {
	constructor() {
		this.stream = null;
		this.effect = null;
		this.customizedLocalStream = 0;
		this.audioStream = null;
	}

	/*创建本地媒体流带水印和背景*/
	async createCustomizedStream(options, videoId, resolution, frameRate, aitype, videoDeviceID = undefined, audioDeviceID = undefined, noAudio = false) {
		return new Promise((resolve, reject) => {
			const { background, watermark } = options;
			if (background.type === 'none' && watermark.type === 'none') {
				return resolve(null);
			}
			const effectOption = {
				enabled: true,
				backgroundType: background.type,
				virtualSource: background.image,
				blurValue: background.blurRadius,
				enableFilter: false
			};
			const watermarkOption = {
				enabled: true,
				backgroundType: watermark.type,
				virtualSource: watermark.image,
				enableFilter: false
			};

			let audio = {
				deviceId: audioDeviceID ? audioDeviceID : undefined, //Do not provide deviceId if source is not "mic".
				source: 'mic' //Values could be "mic", "screen-cast", "file" or "mixed".
			};

			let video = {
				resolution: resolution, //The Resolution defines the size of a rectangle.
				frameRate: frameRate,
				deviceId: videoDeviceID ? videoDeviceID : undefined, //Do not provide deviceId if source is not "camera".
				source: 'camera' //values could be "camera", "screen-cast", "file" or "mixed".
			};
			let mediaStreamDeviceConstraints = {
				audio: audio,
				video: video
			};
			const self = this;
			// console.log('water mark stream options', mediaStreamDeviceConstraints);
			MediaStreamFactory.createMediaStream(mediaStreamDeviceConstraints)
				.then(function (mediaStream) {
					const cameraVideo = document.getElementById(videoId);
					cameraVideo.srcObject = mediaStream;
					// console.log('mediaStream : ', mediaStream);
					self.handleCameraStream(
						{ effectOption, watermarkOption },
						videoId,
						mediaStream,
						aitype,
						noAudio,
						resp => {
							resolve(resp);
						},
						error => {
							reject(error);
						}
					);
				})
				.catch(function (error) {
					console.log(error);
					reject(error);
				});
		});
	}

	/*处理camera流*/
	async handleCameraStream(options, videoId, stream, aitype, noAudio, onSuccess, onFailure) {
		const { effectOption, watermarkOption } = options;
		let audioStream = undefined;
		if (!noAudio) {
			let constraints = {
				audio: defaultMediaOptions.cameraStreamAudioConstraints,
				video: false
			};
			audioStream = await this.createAudioMediaStream(constraints, { type: aitype }, false);
		}

		createVirtualBackgroundEffect(effectOption, watermarkOption).then(effect => {
			if (effect) {
				const streamEffect = effect.startEffect(stream);
				const cameraVideo = document.getElementById(videoId);
				cameraVideo.srcObject = streamEffect;
				let videoSource = 'camera';
				let audioSource = 'mic';
				if (!noAudio && audioStream) {
					streamEffect.addTrack(audioStream.mediaStream.getAudioTracks()[0]);
				}
				let streamSourceInfo = new StreamSourceInfo(audioSource, videoSource);
				var customizedLocalStream = new LocalStream(streamEffect, streamSourceInfo, { type: aitype }, false);
				this.stream = stream;
				this.effect = effect;
				this.customizedLocalStream = customizedLocalStream;
				this.audioStream = audioStream;
				onSuccess({ customizedLocalStream: customizedLocalStream });
			} else {
				onFailure('create effect error');
			}
		});
	}

	stopEffect() {
		if (this.effect) {
			this.effect.stopEffect();
			this.effect = null;
		}
		if (this.stream) {
			this.stopStream(this.stream);
			this.stream = null;
		}
		if (this.customizedLocalStream) {
			this.stopStream(this.customizedLocalStream);
			this.customizedLocalStream = null;
		}
		if (this.audioStream) {
			this.stopStream(this.audioStream);
			this.audioStream = null;
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
		} else {
			let oldVideoTracks = stream.getVideoTracks();
			let oldAudioTracks = stream.getAudioTracks();
			for (let track of oldVideoTracks) {
				track.stop();
			}
			for (let track of oldAudioTracks) {
				track.stop();
			}
		}
	}

	/**
	 * 创建一个语音流
	 * @param {object} mediaStreamConstraints  @param {IRtc.Base.StreamConstraints} mediaStreamConstraints 根据指定的配置值创建MediaStream媒体流
	 * @param {object} attributes 媒体流的自定义属性
	 * @param {boolean} upgrade 是否允许升级，切换音视频的时候创建的流，需要设置成false。
	 */
	async createAudioMediaStream(mediaStreamConstraints, attributes, upgrade = false) {
		let videoSource = undefined;
		let audioSource = 'mic';
		let streamSourceInfo = new StreamSourceInfo(audioSource, videoSource);
		const stream = await this.createWebRtcMediaStream(mediaStreamConstraints, streamSourceInfo, attributes, upgrade);
		return stream;
	}

	/**
	 * 创建一个mediaStream
	 * @param {IRtc.Base.StreamConstraints} mediaStreamConstraints 根据指定的配置值创建MediaStream媒体流。如果你需要创建一个投屏的媒体流，请确保音频和视频都选用"screen-cast"作为他们的媒体源。
	 * @param {IRtc.Base.StreamSourceInfo} streamSourceInfo 音频源信息和视频源信息
	 * @param {object} attributes 媒体流的自定义属性
	 * @param {boolean} upgrade 是否允许升级，切换音视频的时候创建的流，需要设置成false。
	 * @returns Promise.<IRTC.Base.LocalStream, Error>
	 */
	createWebRtcMediaStream(mediaStreamConstraints, streamSourceInfo, attributes, upgrade = true) {
		return new Promise((resolve, reject) => {
			MediaStreamFactory.createMediaStream(mediaStreamConstraints)
				.then(mediaStream => {
					let stream = new LocalStream(mediaStream, streamSourceInfo, attributes, upgrade);
					resolve(stream);
				})
				.catch(error => {
					reject(error);
				});
		});
	}
}

export default VirtualBackgroundEffectGL;

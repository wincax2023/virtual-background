import { CLEAR_TIMEOUT, TIMEOUT_TICK, SET_TIMEOUT, timerWorkerScript } from './TimerWorker';

import { bilateralFilterFast } from './bilateralFilter/bilateralFilterFast.js';
// import { bilateralFilter } from "./bilateralFilter/bilateralFilter.js"

export const VIRTUAL_BACKGROUND_TYPE = {
	IMAGE: 'image',
	DESKTOP_SHARE: 'desktop-share',
	BLUR: 'blur',
	NONE: 'none'
};
/**
 * Represents a modified MediaStream that adds effects to video background.
 * <tt>JitsiStreamBackgroundEffect</tt> does the processing of the original
 * video stream.
 */
export default class JitsiStreamBackgroundEffect {
	// _model: Object;
	// _options: Object;
	// _desktopShareDimensions: Object;
	// _segmentationPixelCount: number;
	// _inputVideoElement: HTMLVideoElement;
	// _onMaskFrameTimer: Function;
	// _maskFrameTimerWorker: Worker;
	// _outputCanvasElement: HTMLCanvasElement;
	// _outputCanvasCtx: Object;
	// _segmentationMaskCtx: Object;
	// _segmentationMask: Object;
	// _segmentationMaskCanvas: Object;
	// _renderMask: Function;
	// _virtualImage: HTMLImageElement;
	// _virtualVideo: HTMLVideoElement;
	// isEnabled: Function;
	// startEffect: Function;
	// stopEffect: Function;

	/**
	 * Represents a modified video MediaStream track.
	 *
	 * @class
	 * @param {Object} model - Meet model.
	 * @param {Object} options - Segmentation dimensions.
	 */
	constructor(model, options) {
		const self = this;
		this._options = options;

		if (this._options.virtualBackground.backgroundType === VIRTUAL_BACKGROUND_TYPE.IMAGE) {
			this._virtualImage = document.createElement('img');
			this._virtualImage.crossOrigin = 'anonymous';
			this._virtualImage.src = this._options.virtualBackground.virtualSource;
		}
		if (this._options.virtualBackground.backgroundType === VIRTUAL_BACKGROUND_TYPE.DESKTOP_SHARE) {
			this._virtualVideo = document.createElement('video');
			this._virtualVideo.autoplay = true;
			this._virtualVideo.srcObject = this._options?.virtualBackground?.virtualSource?.stream;
		}
		// watermark
		if (this._options.watermark.backgroundType === VIRTUAL_BACKGROUND_TYPE.IMAGE) {
			this._watermarkImage = document.createElement('img');
			this._watermarkImage.crossOrigin = 'anonymous';
			this._watermarkImage.src = this._options.watermark.virtualSource;
			this._watermarkImage.addEventListener('load', function (e) {
				// Get the size
				self._watermarkImageWidth = e.target.width;
				self._watermarkImageHeight = e.target.height;
			});
		}
		this._model = model;
		this._segmentationPixelCount = this._options.width * this._options.height;

		// Bind event handler so it is only bound once for every instance.
		this._onMaskFrameTimer = this._onMaskFrameTimer.bind(this);

		// Workaround for FF issue https://bugzilla.mozilla.org/show_bug.cgi?id=1388974
		this._outputCanvasElement = document.createElement('canvas');
		this._outputCanvasElement.getContext('2d');
		this._inputVideoElement = document.createElement('video');

		this.paddedGrayedInputImageBuffer = [530 * 530]; // Padded image Buffer

		this.bf = new bilateralFilterFast();
		this.bf.sigma = 4; // 3 6 12
		this.bf.bins = 32; // 64
	}

	/**
	 * EventHandler onmessage for the maskFrameTimerWorker WebWorker.
	 *
	 * @private
	 * @param {EventHandler} response - The onmessage EventHandler parameter.
	 * @returns {void}
	 */
	_onMaskFrameTimer(response) {
		if (response.data.id === TIMEOUT_TICK) {
			this._renderMask();
		}
	}

	/**
	 * Represents the run post processing.
	 *
	 * @returns {void}
	 */
	runPostProcessing() {
		const { backgroundType } = this._options.virtualBackground;

		this._outputCanvasCtx.globalCompositeOperation = 'copy';

		// Draw segmentation mask.
		//

		// Smooth out the edges.
		this._outputCanvasCtx.filter = backgroundType === VIRTUAL_BACKGROUND_TYPE.IMAGE ? 'blur(4px)' : 'blur(8px)';

		if (backgroundType !== VIRTUAL_BACKGROUND_TYPE.NONE) {
			this._outputCanvasCtx.drawImage(this._segmentationMaskCanvas, 0, 0, this._options.width, this._options.height, 0, 0, this._inputVideoElement.width, this._inputVideoElement.height);
		}

		this._outputCanvasCtx.globalCompositeOperation = 'source-in';
		this._outputCanvasCtx.filter = 'none';

		// this._outputCanvasCtx.filter = "saturate(110%) brightness(150%) contrast(110%) blur(1px)"

		// Draw the foreground video.
		//
		this._outputCanvasCtx.drawImage(this._inputVideoElement, 0, 0);

		// Draw the background.
		//
		this._outputCanvasCtx.globalCompositeOperation = 'destination-over';
		// this._outputCanvasCtx.globalCompositeOperation = "destination-atop";
		if (backgroundType === VIRTUAL_BACKGROUND_TYPE.IMAGE) {
			this._outputCanvasCtx.drawImage(this._virtualImage, 0, 0, this._inputVideoElement.width, this._inputVideoElement.height);
		}
		if (backgroundType === VIRTUAL_BACKGROUND_TYPE.DESKTOP_SHARE) {
			this._outputCanvasCtx.drawImage(this._virtualVideo, 0, 0, this._desktopShareDimensions.width, this._desktopShareDimensions.height);
		}

		if (backgroundType === VIRTUAL_BACKGROUND_TYPE.BLUR) {
			const blur = this._options.virtualBackground.blurValue || 12;
			this._outputCanvasCtx.filter = `blur(${blur}px)`;
			this._outputCanvasCtx.drawImage(this._inputVideoElement, 0, 0);
		}

		// Draw the foreground watermark. source-over destination-over lighter
		if (this._options.watermark.backgroundType === VIRTUAL_BACKGROUND_TYPE.IMAGE) {
			this._outputCanvasCtx.drawImage(this._inputVideoElement, 0, 0);
			this._outputCanvasCtx.globalCompositeOperation = 'source-over';
			this._outputCanvasCtx.filter = 'blur(0px)';
			// drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight) 右上角
			const posX = this._inputVideoElement.width - this._watermarkImageWidth;
			this._outputCanvasCtx.drawImage(this._watermarkImage, 0, 0, this._watermarkImageWidth, this._watermarkImageHeight, posX, 0, this._watermarkImageWidth, this._watermarkImageHeight);
		}
	}

	/**
	 * Represents the run Tensorflow Interference.
	 *
	 * @returns {void}
	 */
	runInference() {
		this._model._runInference();
		const outputMemoryOffset = this._model._getOutputMemoryOffset() / 4;

		for (let i = 0; i < this._segmentationPixelCount; i++) {
			const background = this._model.HEAPF32[outputMemoryOffset + i * 2];
			const person = this._model.HEAPF32[outputMemoryOffset + i * 2 + 1];
			const shift = Math.max(background, person);
			const backgroundExp = Math.exp(background - shift);
			const personExp = Math.exp(person - shift);

			// Sets only the alpha component of each pixel.
			// const alfa = (255 * personExp) / (backgroundExp + personExp)
			this._segmentationMask.data[i * 4 + 3] = (255 * personExp) / (backgroundExp + personExp);
		}
		if (this._options.virtualBackground.enableFilter) {
			const cda = this.bf.run(this._segmentationMask);
			this._segmentationMaskCtx.putImageData(cda, 0, 0);
		} else {
			this._segmentationMaskCtx.putImageData(this._segmentationMask, 0, 0);
		}
	}

	/**
	 * Loop function to render the background mask.
	 *
	 * @private
	 * @returns {void}
	 */
	_renderMask() {
		const desktopShareTrack = this._options?.virtualBackground?.virtualSource?.track;

		if (desktopShareTrack) {
			this._desktopShareDimensions = desktopShareTrack.getSettings ? desktopShareTrack.getSettings() : desktopShareTrack.getConstraints();
		}
		this.resizeSource();
		this.runInference();
		this.runPostProcessing();

		this._maskFrameTimerWorker.postMessage({
			id: SET_TIMEOUT,
			timeMs: 1000 / 30
		});
	}

	/**
	 * Represents the resize source process.
	 *
	 * @returns {void}
	 */
	resizeSource() {
		this._segmentationMaskCtx.drawImage(this._inputVideoElement, 0, 0, this._inputVideoElement.width, this._inputVideoElement.height, 0, 0, this._options.width, this._options.height);

		const imageData = this._segmentationMaskCtx.getImageData(0, 0, this._options.width, this._options.height);
		const inputMemoryOffset = this._model._getInputMemoryOffset() / 4;

		for (let i = 0; i < this._segmentationPixelCount; i++) {
			this._model.HEAPF32[inputMemoryOffset + i * 3] = imageData.data[i * 4] / 255;
			this._model.HEAPF32[inputMemoryOffset + i * 3 + 1] = imageData.data[i * 4 + 1] / 255;
			this._model.HEAPF32[inputMemoryOffset + i * 3 + 2] = imageData.data[i * 4 + 2] / 255;
		}
	}

	/**
	 * Checks if the local track supports this effect.
	 *
	 * @param {JitsiLocalTrack} jitsiLocalTrack - Track to apply effect.
	 * @returns {boolean} - Returns true if this effect can run on the specified track
	 * false otherwise.
	 */
	isEnabled(jitsiLocalTrack) {
		return jitsiLocalTrack.isVideoTrack() && jitsiLocalTrack.videoType === 'camera';
	}

	/**
	 * Starts loop to capture video frame and render the segmentation mask.
	 *
	 * @param {MediaStream} stream - Stream to be used for processing.
	 * @returns {MediaStream} - The stream with the applied effect.
	 */
	startEffect(stream) {
		if (!this._options.virtualBackground.enabled) {
			return stream;
		}
		this._maskFrameTimerWorker = new Worker(timerWorkerScript, {
			name: 'Blur effect worker'
		});
		this._maskFrameTimerWorker.onmessage = this._onMaskFrameTimer;
		const firstVideoTrack = stream.getVideoTracks()[0];
		const { height, frameRate, width } = firstVideoTrack.getSettings ? firstVideoTrack.getSettings() : firstVideoTrack.getConstraints();

		this._frameRate = frameRate;

		this._segmentationMask = new ImageData(this._options.width, this._options.height);
		this._segmentationMaskCanvas = document.createElement('canvas');
		this._segmentationMaskCanvas.width = this._options.width;
		this._segmentationMaskCanvas.height = this._options.height;
		this._segmentationMaskCtx = this._segmentationMaskCanvas.getContext('2d');

		this._outputCanvasElement.width = parseInt(width, 10);
		this._outputCanvasElement.height = parseInt(height, 10);
		this._outputCanvasCtx = this._outputCanvasElement.getContext('2d');
		this._inputVideoElement.width = parseInt(width, 10);
		this._inputVideoElement.height = parseInt(height, 10);
		this._inputVideoElement.autoplay = true;
		this._inputVideoElement.srcObject = stream;
		this._inputVideoElement.onloadeddata = () => {
			this._maskFrameTimerWorker.postMessage({
				id: SET_TIMEOUT,
				timeMs: 1000 / 30
			});
		};

		return this._outputCanvasElement.captureStream(parseInt(frameRate, 10));
	}

	/**
	 * Stops the capture and render loop.
	 *
	 * @returns {void}
	 */
	stopEffect() {
		if (!this._maskFrameTimerWorker) return;
		this._maskFrameTimerWorker.postMessage({
			id: CLEAR_TIMEOUT
		});

		this._maskFrameTimerWorker.terminate();
	}

	getSegmentationMaskStream() {
		if (!this._options.virtualBackground.enabled) {
			return null;
		}
		return this._segmentationMaskCanvas.captureStream(parseInt(this._frameRate, 10));
	}
}

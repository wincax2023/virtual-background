import VirtualBackgroundEffect from './virtual-background/virtual-background';
import {defaultMediaOptions} from './config'
import { buildWebGL2Pipeline } from './virtual-background/webgl2/webgl2Pipeline'
import { createTimerWorker } from './virtual-background/helpers/timerHelper'

import {IRtc} from './ivcs'
// const IRtc = ivcs.IRtc;
let { StreamSourceInfo, MediaStreamFactory, LocalStream} = IRtc.Base;

const nopeImage = '/static/background/img/background/nope.png';
class BackgroundEffectGL {
   
	constructor() {
		this.webarEffect = undefined;
        this.virtualOption = {type: 'none', image: nopeImage};
        this.watermarkOption = {type: 'none', image: nopeImage};
        this.pipeline = null;
        this.timerWorker = null;
	}

    async createEffectStream(sourcePlayback, backgroundImage, canvas, tflite, background, watermark, noAudio = false){
        if (this.virtualOption.type === 'none' &&  background.type === 'none' && this.watermarkOption.type === 'none' &&  watermark.type === 'none') {
            // console.warn('createEffectStream : ', background, watermark);
            return;
        }
        if (this.virtualOption.type === background.type && this.virtualOption.image === background.image && this.watermarkOption.type === watermark.type && this.watermarkOption.image === watermark.image) {
            // console.warn('createEffectStream : ', background, watermark);
            return;
        }
        
        this.virtualOption.type = background.type;
        this.virtualOption.image = background.image;
        this.watermarkOption.type = watermark.type;
        this.watermarkOption.image = watermark.image;
        // release effect
        this.stopEffect();

        // const audioDeviceID = defaultMediaOptions.cameraStreamAudioConstraints.deviceId;
        // const videoDeviceID = defaultMediaOptions.cameraStreamVideoConstraints.deviceId;
        // const {resolution, frameRate} = defaultMediaOptions.cameraStreamVideoConstraints;
    
        // const webarEffect = new VirtualBackgroundEffect();
        // const stream = await webarEffect.createCustomizedStream({ background: background, watermark: watermark }, videoId, resolution, frameRate,  agentLabel, videoDeviceID, audioDeviceID, noAudio);
        // this.webarEffect = webarEffect;
        // type: background.background.type,
        // url: background.background.image,
        const backgroundConfig = {
            type: background.type,
            url: background.image,
        }
        const segmentationConfig = {
            model: 'meet',
            backend: 'wasm',
            inputResolution: '160x96',
            pipeline: 'webgl2',
            targetFps: 0.1,
            deferInputResizing: 'true'
        }
        this.pipeline = buildWebGL2Pipeline(
            sourcePlayback,
            backgroundImage,
            backgroundConfig,
            segmentationConfig,
            canvas,
            tflite,
            () => {}
        )
        this.timerWorker = createTimerWorker();
        this.timerWorker.onmessage(() => {
            this.render()
        }) // this.onmessage()
        this.render()
        const postProcessingConfig = {
            smoothSegmentationMask: true,
            jointBilateralFilter: { sigmaSpace: 1, sigmaColor: 0.1 },
            coverage: [0.5, 0.75],
            lightWrapping: 0.3,
            blendMode: 'screen',
        };
        const self = this;
        setTimeout(() => {
            self.pipeline.updatePostProcessingConfig(postProcessingConfig)
        }, 1000)
        
        return;
    }

    onmessage = async () => {
        console.warn('onmessage', this.render);
        this.render()
    }

    render = async () => {
        
        if (this.pipeline) {
            await this.pipeline.render()
        } else {
            console.warn('this.pipeline', this.pipeline);
        }
        this.timerWorker.setTimeout(
          Math.max(0, 1000 / 30)
        );
    }

    async createmediaStream(agentLabel) {   
        if (this.virtualOption.type === 'none' && this.watermarkOption.type === 'none')  {
            return;
        }
        
        this.virtualOption.type = 'none';
        this.virtualOption.image = nopeImage;
        this.watermarkOption.type = 'none';
        this.watermarkOption.image = nopeImage;
        // release effect
        this.stopEffect();

        let mediaStreamConstraints = {
            audio: defaultMediaOptions.cameraStreamAudioConstraints,
            video: defaultMediaOptions.cameraStreamVideoConstraints
        };
        let videoSource = 'camera';
	    let audioSource = 'mic';
		let streamSourceInfo = new StreamSourceInfo(audioSource, videoSource);

        if (!this.webarEffect) {
            this.webarEffect = new VirtualBackgroundEffect();
        }

        const stream = await this.webarEffect.createWebRtcMediaStream(mediaStreamConstraints, streamSourceInfo, { type: agentLabel }, false);
		return stream;
	}

    stopEffect(reset = false) {
        if (this.webarEffect) {
            this.webarEffect.stopEffect();
            this.webarEffect = undefined;
        }
        if (reset) {
            this.virtualOption = {type: 'none', image: nopeImage};
            this.watermarkOption = {type: 'none', image: nopeImage};
        }
        if (this.timerWorker) {
            console.warn('clearTimeout');
            this.timerWorker.clearTimeout(this.renderTimeoutId)
            this.timerWorker.terminate()
        }
        
        if (this.pipeline) {
            this.pipeline.cleanUp()
        }
    }

    async startCamera(agentLabel) {
        return new Promise((resolve, reject) => {
            let mediaStreamDeviceConstraints = {
				audio: defaultMediaOptions.cameraStreamAudioConstraints,
				video: defaultMediaOptions.cameraStreamVideoConstraints,
			};
            MediaStreamFactory.createMediaStream(mediaStreamDeviceConstraints)
				.then(function (mediaStream) {
                    let videoSource = 'camera';
                    let audioSource = 'mic';
                    let streamSourceInfo = new StreamSourceInfo(audioSource, videoSource);
                    const customizedLocalStream = new LocalStream(mediaStream, streamSourceInfo, { type: agentLabel }, true);
					resolve(customizedLocalStream);
				})
				.catch(function (error) {
					console.log(error);
					reject(error);
				});
                
        });
    }
}

const backgroundEffectGL = new BackgroundEffectGL();

export default backgroundEffectGL; 
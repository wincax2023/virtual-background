import VirtualBackgroundEffect from './virtual-background/virtual-background';
import {defaultMediaOptions} from './config'
import {IRtc} from './ivcs'
// const IRtc = ivcs.IRtc;
let { StreamSourceInfo, MediaStreamFactory, LocalStream} = IRtc.Base;

const nopeImage = '/static/background/img/background/nope.png';
class BackgroundEffect {
   
	constructor() {
		this.webarEffect = undefined;
        this.virtualOption = {type: 'none', image: nopeImage};
        this.watermarkOption = {type: 'none', image: nopeImage};
	}

    async createEffectStream(agentLabel, videoId, background, watermark, noAudio = false){
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

        const audioDeviceID = defaultMediaOptions.cameraStreamAudioConstraints.deviceId;
        const videoDeviceID = defaultMediaOptions.cameraStreamVideoConstraints.deviceId;
        const {resolution, frameRate} = defaultMediaOptions.cameraStreamVideoConstraints;
    
        const webarEffect = new VirtualBackgroundEffect();
        const stream = await webarEffect.createCustomizedStream({ background: background, watermark: watermark }, videoId, resolution, frameRate,  agentLabel, videoDeviceID, audioDeviceID, noAudio);
        this.webarEffect = webarEffect;
        return  stream.customizedLocalStream;
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

const backgroundEffect = new BackgroundEffect();

export default backgroundEffect; 
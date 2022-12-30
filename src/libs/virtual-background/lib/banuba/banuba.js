import { Webcam, Effect, MediaStreamCapture } from './BanubaSDK';
import webarEffect from '../../webar.js';

export const WatermarkPostionType = {
    TOP_LEFT: 1,
    TOP_MIDDLE: 2,
    TOP_RIGHT: 3,
    BOTTOM_LEFT: 4,
    BOTTOM_MIDDLE: 5,
    BOTTOM_RIGHT: 6,
};

export class WebarEffect {
    constructor(onPlayerReady) {
        this.player = null;
        this.effect = null;
        this.image = null;
        this.videoHeight = 0;
        this.videoWidth = 0;
        this.stoped = false;
        this.onPlayerReady = onPlayerReady;

        (this.positions = {
            1: { x: 0, y: 0 },
            2: { x: (this.videoWidth - 128) / 2, y: 0 },
            3: { x: this.videoWidth - 128, y: 0 },
            4: { x: 0, y: this.videoHeight - 32 },
            5: {
                x: (this.videoWidth - 128) / 2,
                y: this.videoHeight - 32,
            },
            6: { x: this.videoWidth - 128, y: this.videoHeight - 32 },
        }),
            (this.watermarkPos = this.positions[1]);
    }

    async createEffect(token) {
        if (this.player) return;
        // 	428 x 926
        const wcam = new Webcam({ width: 428, height: 926 });
        this.webcam = wcam;
        // this.player = await Player.create({
        //     clientToken: token,
        //     maxFaces: 1,
        //     locateFile: {
        //         'BanubaSDK.data': '../../../../../static/banuba/BanubaSDK.data',
        //         'BanubaSDK.wasm': '../../../../../static/banuba/BanubaSDK.wasm',
        //         'BanubaSDK.simd.wasm': '../../../../../static/banuba/BanubaSDK.simd.wasm',
        //     },
        //     enableMirroring: true,
        // });
        this.player = webarEffect.player;

        this.player.use(wcam);
        this.player.play();

        // this.effect = await Effect.preload(`../../../../../static/effects/Makeup.zip`);
        this.effect = webarEffect.effect;
        this.player.applyEffect(this.effect);
        // this.player.callJsMethod('BackgroundTexture.set', 'bg_alarm_tile.png');
        // 	428 x 926
        this.image = new Image(428, 926); // Using optional size for image
        // image.onload = drawImageActualSize; // Draw when image has loaded

        // Load an image of intrinsic size 300x227 in CSS pixels
        // this.image.src = 'assets/img/watermark0.png';

        // #region postprocessing
        const capture = document.createElement('video');
        capture.autoplay = true;
        this.capture = new MediaStreamCapture(this.player);
        capture.srcObject = this.capture;

        // this.player.addEventListener(Player.EFFECT_ACTIVATED_EVENT, this.onPlayerReady);
        if (this.onPlayerReady) {
          this.onPlayerReady();
        }

        const canvas = document.getElementById('postprocessed');
        const ctx = canvas.getContext('2d');

        const THIS = this;
        function postprocess() {
            THIS.videoHeight = capture.videoHeight;
            THIS.videoWidth = capture.videoWidth;

            canvas.width = capture.videoWidth;
            canvas.height = capture.videoHeight;

            ctx.drawImage(capture, 0, 0);
            if (THIS.image.src) {
                ctx.drawImage(
                    THIS.image,
                    THIS.watermarkPos.x,
                    THIS.watermarkPos.y
                );
            }
        }

        (function loop() {
            if (!THIS.stoped) {
                postprocess();
                requestAnimationFrame(loop);
            }
        })();
        // #endregion
    }

    setWatermarkPosType(type) {
        if (type < 1 || type > 6) {
            console.error(
                'set watermark position error : type not in [1, 6] !'
            );
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
            console.error('set effect error : api is null !');
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
            y: this.videoHeight - 32,
        };
        this.positions[6] = {
            x: this.videoWidth - 128,
            y: this.videoHeight - 32,
        };
    }

    stopEffect() {
      this.stoped = true;
      if (this.player) {
          // this.player.removeEventListener(Player.EFFECT_ACTIVATED_EVENT, this.onPlayerReady);
          this.player.clearEffect();
          // this.player = null;
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

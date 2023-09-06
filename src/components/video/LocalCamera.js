import { useEffect, useState } from 'react';
import {  useSelector } from 'react-redux';
import backgroundEffect from '../../libs/BackgroundEffect';
import backgroundEffectGL from '../../libs/BackgroundEffectGL';
import useTFLite from '../../libs/virtual-background/core/hooks/useTFLite'

import './Video.scss';


const ImageItem = (props) => {
    const { background, watermark } = useSelector((state) => state.background);
    const [paused, setPause] = useState(true)
    // const [backgroundConfig, setBackgroundConfig] = useState()

    // useEffect(() => {
    //     setBackgroundConfig({
    //         type: background.type,
    //         url: background.image,
    //     })
    // }, [background]);

    const videoId = '123456789';

    const [sourcePlayback, setSourcePlayback] = useState({})
    // const [pipeline, setPipeline] = useState()
    // const [renderTimeoutId, setRenderTimeoutId] = useState()
    const [segmentationConfig] = useState({
        model: 'meet',
        backend: 'wasm',
        inputResolution: '160x96',
        pipeline: 'webgl2',
        targetFps: 65,
        deferInputResizing: 'true'
    })
    
    const { tflite } = useTFLite(segmentationConfig)

    console.warn('useTFLite');
    
    // function addFrameEvent() {}

    // const targetTimerTimeoutMs = 1000 / segmentationConfig.targetFps;

    // let timerWorker = null;
 
    useEffect(() => {

        const htmlElement = document.getElementById(videoId);
        const _sourcePlayback = {
            htmlElement: htmlElement,
            height: htmlElement.clientHeight,
            width: htmlElement.clientWidth
        }

        
        
        setSourcePlayback(_sourcePlayback)

        

        const isSafari = true;
        
        
        const startEffect4Safari = async () => {

            if (paused) {
                backgroundEffectGL.stopEffect(true)
                return
            }

            if (background.type === 'none' && watermark.type === 'none') {
                backgroundEffectGL.stopEffect(true)

                const stream = await backgroundEffect.startCamera('label');
                if (stream) {
                    const video = document.getElementById(videoId);
                    video.srcObject = stream.mediaStream;
                }
                const canvas = document.getElementById('canvas');
                backgroundEffectGL.createEffectStream(sourcePlayback, null, canvas, tflite, background, watermark, null)
            } else {
                const backgroundImage = document.getElementById('background');
                const canvas = document.getElementById('canvas');
                // watermark
                const watermarkImage = document.getElementById('watermark');
                console.log('watermarkImage', watermarkImage);
                
                // sourcePlayback, backgroundImage, canvas, tflite, background, watermark, watermarkImage
                backgroundEffectGL.createEffectStream(sourcePlayback, backgroundImage, canvas, tflite, background, watermark, watermarkImage)

            }
            
        }

        if (isSafari) {
            startEffect4Safari();
        } else {
            // startEffect();
            startEffect4Safari();
        }
        
	}, [background, watermark, paused]);

    const onStart = () => {
        setPause(false)
    }
    const onStop = () => {
        setPause(true)
    }
	return (
		<div className="video-container" >
            <button onClick={onStart}>Start</button>
            <button onClick={onStop}>Stop</button>
            <div className="video-wrapper" >
                <video className="video" id={videoId} autoPlay controls={false} ></video>
                {segmentationConfig ? <canvas
                    // The key attribute is required to create a new canvas when switching
                    // context mode
                    className="canvas"
                    key={segmentationConfig.pipeline}
                    id='canvas'
                    width={sourcePlayback.width}
                    height={sourcePlayback.height}
                /> : null}
                <img
                    id='background'
                    className="background"
                    src={background.image}
                    alt=""
                    hidden={true}
                />
                <img
                    id='watermark'
                    className="watermark"
                    src={watermark.image}
                    alt=""
                    hidden={true}
                />
            </div>
		</div>
	);
};

export default ImageItem;

import { useEffect, useState } from 'react';
import {  useSelector } from 'react-redux';
import backgroundEffect from '../../libs/BackgroundEffect';
import backgroundEffectGL from '../../libs/BackgroundEffectGL';
import { buildWebGL2Pipeline } from '../../libs/virtual-background/webgl2/webgl2Pipeline'
import useTFLite from '../../libs/virtual-background/core/hooks/useTFLite'
import { createTimerWorker } from '../../libs/virtual-background/helpers/timerHelper'

import './Video.scss';


const ImageItem = (props) => {
    const { background } = useSelector((state) => state);
    // const [backgroundConfig, setBackgroundConfig] = useState()

    // useEffect(() => {
    //     setBackgroundConfig({
    //         type: background.background.type,
    //         url: background.background.image,
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

            if (background.background.type === 'none') {
                backgroundEffectGL.stopEffect(true)

                const stream = await backgroundEffect.startCamera('label');
                if (stream) {
                    const video = document.getElementById(videoId);
                    video.srcObject = stream.mediaStream;
                }
            } else {
                const backgroundImage = document.getElementById('background');
                const canvas = document.getElementById('canvas');
                
                // createEffectStream(sourcePlayback, backgroundImage, canvas, tflite, background, watermark, noAudio = false)
                backgroundEffectGL.createEffectStream(sourcePlayback, backgroundImage, canvas, tflite, background.background, {})

            }
            
        }

        const startEffect = async () => {
            let stream = null;
            if (background.background.type === 'none') {
                stream = await backgroundEffect.createmediaStream('label');
            } else {
                stream = await backgroundEffect.createEffectStream('label', videoId, background.background, {});
            }
            if (stream) {
                const video = document.getElementById(videoId);
                video.srcObject = stream.mediaStream;
            }
        }
        
        if (isSafari) {
            startEffect4Safari();
        } else {
            startEffect();
        }
        
	}, [background]);


	return (
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
                src={background.background.image}
                alt=""
                hidden={true}
            />
		</div>
	);
};

export default ImageItem;

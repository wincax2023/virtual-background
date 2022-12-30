export const defaultMediaOptions = {
	cameraStreamAudioConstraints: { deviceId: void 0, source: 'mic' },
	cameraStreamVideoConstraints: { deviceId: void 0, frameRate: 15, resolution: { width: 640, height: 480 }, source: 'camera' },
	cameraPublishOptions: {
		audio: [{ codec: { name: 'opus' }, maxBitrate: 64 }],
		video: [
			{ codec: { name: 'vp8' }, maxBitrate: 1024 },
			{ codec: { name: 'h264' }, maxBitrate: 1024 }
		]
	},
	screenStreamAudioConstraints: { source: 'screen-cast' },
	screenStreamVideoConstraints: { frameRate: 15, resolution: { width: 1280, height: 720 }, source: 'screen-cast' },
	screenPublishOptions: {
		audio: [{ codec: { name: 'opus' }, maxBitrate: 64 }],
		video: [
			{ codec: { name: 'vp8' }, maxBitrate: 1024 },
			{ codec: { name: 'h264' }, maxBitrate: 1024 }
		]
	}
};

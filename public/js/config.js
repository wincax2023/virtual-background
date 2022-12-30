const env = 'test-k8s-azure';
const customer_env = 'test-';
// 访问后端地址

const loginUrl = `https://ivcs-${env}.zealcomm.cn`;

// 邀请访客链接地址
const customerUrl = `https://${customer_env}ivcs-client-widget.zealcomm.cn/#/?inviteCode=`;
// 表单服务地址
const formUrl = `https://ivcs-${env}.zealcomm.cn`;
// 文件上传
const uploadFileUrl = `${loginUrl}/ivcs/api/v1/upload`;

logLevel = 1;

defaultMediaOptions = {
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

//上传文件最大大小
maxUploadFileSize = 1024000 * 50;

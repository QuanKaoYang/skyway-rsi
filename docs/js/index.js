const mconf = {
    lang1Name: 'Japanese',
    lang2Name: 'Chinese',
}

function updateDisplayText(oldTexts, newText, limit) {
    oldTexts.push(newText.trim());
    if (oldTexts.length >= limit) {
        oldTexts.shift();
    }
    return oldTexts.join('\n');
}

async function getSkyKey(key) {
    return new Promise(resolve => {
        fetch(`https://sheepy-meme.builtwithdark.com/skylogin?key=${key}`).then(res => {
            if (res.status === 200) {
                res.text().then(t => {
                    resolve(t);
                })
            }
        })
    })
}

async function getMediaStream(getters) {
    let foundAudio = false;
    let foundCamera = false;
    return new Promise((resolve, reject) => {
        navigator.mediaDevices.enumerateDevices().then(devs => {
            for (const dev of devs) {
                if (dev.kind === 'audioinput') {
                    foundAudio = true;
                } else if (dev.kind === 'videoinput') {
                    foundCamera = true;
                }
            }
            const getMedia = {
                video: (getters.video && foundCamera) ? true: false,
                audio: (getters.audio && foundAudio) ? true: false,
            };
            navigator.mediaDevices.getUserMedia(getMedia).then(stream => {
                if (getters.video && !foundCamera) {
                    const mockVideo = document.createElement('canvas').captureStream(10);
                    console.log(mockVideo);
                    const mockStream = new MediaStream(
                        [...mockVideo.getVideoTracks(), ...stream.getAudioTracks()]
                    );
                    console.log(mockStream.getTracks())
                    resolve(mockStream);
                } else {
                    resolve(stream);
                }
            }).catch(
                console.error
            );
        })
            
        })
    }
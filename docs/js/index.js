const mconf = {
    lang1Name: 'Japanese',
    lang2Name: 'Chinese',
}

const cv = document.createElement('canvas');

function updateDisplayText(oldTexts, newText, fontClass, limit) {
    oldTexts.push(newText.trim());
    if (oldTexts.length >= limit) {
        oldTexts.shift();
    }
    return oldTexts.join('\n');
}

function coloredLog(oldTexts, newText, limit, fontClass) {
    let text = newText.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    if (fontClass !== undefined) {
        text = `<span class="${fontClass}">${text}</span>`;
    }
    oldTexts.push(text.trim());
    if (oldTexts.length >= limit) {
        oldTexts.shift();
    }
    return oldTexts.join('\n');
}

// async function getSkyKey(key) {
//     return new Promise(resolve => {
//         fetch(`https://sheepy-meme.builtwithdark.com/skylogin?key=${key}`).then(res => {
//             if (res.status === 200) {
//                 res.text().then(t => {
//                     resolve(t);
//                 })
//             }
//         })
//     })
// }

async function confirmInputDevices() {
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
            resolve({foundAudio, foundCamera})
        }).catch(() => {
            console.log('Get Devices failed');
            reject('Get Devices failed');
        });
    });
}

async function login(data) {
    return new Promise((resolve, reject) => {
        fetch(`https://sheepy-meme.builtwithdark.com/meebaalogin`, {
            method: 'POST',
            headers: {
                    'Content-Type': 'text/plain',
                },
            mode: 'cors',
            body: JSON.stringify(data),
        }).then(res => {
            if (res.status === 200) {
                res.text().then(t => {
                    resolve(t);
                })
            } else {
                reject("Login Failed");
            }
        }).catch(() => {
            reject("Login Failed")
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
                    // const canvas = document.createElement('canvas');
                    const cxt = cv.getContext('2d');
                    cxt.font = `20px 'Arial'`
                    cxt.fillText('No Camera...', 10, 30);
                    const mockStream = new MediaStream(
                        [...canvas.captureStream(10), ...stream.getAudioTracks()]
                    );
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
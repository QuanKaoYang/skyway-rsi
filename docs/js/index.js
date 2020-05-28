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

async function getMediaStream(video, audio) {
    return new Promise((resolve, reject) => {
        navigator.mediaDevices
            .getUserMedia({
                video,
                audio
            }).then(stream => {
                if (stream === null) {
                    const mock = document.createElement('canvas');
                    resolve(mock.captureStream(10));
                } else {
                    resolve(stream);
                }
            }).catch(
                console.error
            );
        })
    }
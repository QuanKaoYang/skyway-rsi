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
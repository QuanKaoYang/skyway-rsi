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
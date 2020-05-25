// const mconf = {
//     prefix: 'shitiandashen',
// }

function updateDisplayText(oldTexts, newText) {
    oldTexts.push(newText);
    if (oldTexts.length >= 20) {
        oldTexts.shift();
    }
    return oldTexts.join('\n');
}
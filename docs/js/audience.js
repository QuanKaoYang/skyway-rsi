const Peer = window.Peer;
// const strm = window.strm;
// 会場と言語の組み合わせ
const vlProduction = ['ao', 'ai', 'bo', 'bi', 'co', 'ci'];

(async function main(){

    // ローカルストレージにAPI Keyが保存されていればInputボックスに自動入力
    if (window.localStorage.getItem('myskyway') !== null) {
        document.getElementById('apikey').value = window.localStorage.getItem('myskyway'); 
    }

    // 会場とデフォルトのチャネル別のPeerIDを作成するための接尾辞
    // ハッシュ# 付きのURLを使用する予定
    let suffix;
    if (!location.hash) {
        suffix = 'ao';
    } else if (vlProduction.indexOf(suffix) === -1) {
        suffix = 'ao';
    } else {
        suffix = location.hash.replace('#', '');
    }

    // 会場用の変数を用意しておく
    let main;
    let ip;
    let audience;

    const originalHeader = document.getElementById('originalH');
    const interHeader = document.getElementById('interpreterH');
    const hostHeader = document.getElementById('hostH');
    const originalAudio = document.getElementById('original');
    const interAudio = document.getElementById('interpreter');
    const hostAudio = document.getElementById('host');
    const initBtn = document.getElementById('initBtn');
    const connectBtn = document.getElementById('connectBtn');

    // 最初の接続を行う
    initBtn.addEventListener('click', async() => {
        // Peer接続のためのコンストラクタ
        // masterからの接頭辞 + 役割 + 接尾辞（ex shitianweidavenue1）
        window.Peer = new Peer(`${mconf.prefix}aud${suffix}`,{
            key: document.getElementById('apikey').value,
            debug: 1,
        });

        // ローカルストレージへのAPI Keyを保存しておく
        window.localStorage.setItem('myskyway', document.getElementById('apikey').value);

        initBtn.disabled = true;
        connectBtn.disabled = false;
    });

    // ホストと接続する
    connectBtn.addEventListener('click', async () => {
        if (!window.Peer.open) {
            alert('peer abort');
            return;
        } else {
            console.log('peer succeed');
        }

        // 表示領域の変更を行う
        document.getElementById('pass').classList.add('notshow');
        document.getElementById('contents').classList.remove('notshow');
        
        // ホスト-オーディエンス
        // データのやり取りのみ行う
        // main = window.Peer.joinRoom('mainsession', {
        //     mode: 'sfu',
        //     stream: null,
        // });

        // 会場&通訳-オーディエンス
        audience = window.Peer.joinRoom('audience', {
            mode: 'sfu',
            stream: null,
        });

        // 会場からの音・通訳からの音をそれぞれAudioのソースに設定
        audience.on('stream', async stream => {
            console.log('set audience stream')
            const sourceId = stream.peerId.replace(mconf.prefix);
            if (sourceId.startsWith('venue')){
                originalAudio.srcObject = stream;
                // originalAudio.volume = 0.7;
            } else if (sourceId.startsWith('inter')){
                interAudio.srcObject = stream;
                // interAudio.volume = 0.7;
            } else {
                hostAudio.srcObject = stream;
            }
        });

        audience.on('data', ({ src, data }) => {
            console.log(data);
            switch (data) {
                case 'L1':
                    if (suffix.endsWith('o')) {
                        interAudio.suspend();
                        interHeader.classList.remove('selected');
                        hostAudio.suspend();
                        hostHeader.classList.remove('selected');
                        originalAudio.resume();
                        originalHeader.classList.add('selected');
                    } else {
                        originalAudio.suspend();
                        originalHeader.classList.remove('selected');
                        hostAudio.suspend();
                        hostHeader.classList.remove('selected');
                        interAudio.resume();
                        interHeader.classList.add('selected');
                    }
                    break;
                
                case 'L2':
                    if (suffix.endsWith('o')) {
                        originalAudio.suspend();
                        originalHeader.classList.remove('selected');
                        hostAudio.suspend();
                        hostHeader.classList.remove('selected');
                        interAudio.resume();
                        interHeader.classList.add('selected');
                    } else {
                        interAudio.suspend();
                        interHeader.classList.remove('selected');
                        hostAudio.suspend();
                        hostHeader.classList.remove('selected');
                        originalAudio.resume();
                        originalHeader.classList.add('selected');
                    }
                    break;
            
                case 'L0':
                    originalAudio.suspend();
                    originalHeader.classList.remove('selected');
                    interAudio.suspend();
                    interHeader.classList.remove('selected');
                    hostAudio.resume();
                    hostHeader.classList.add('selected');

                default:
                    break;
            }
        })

        // main.on('stream', async stream => {
        //     console.log('new main')
        //     const newVideo = document.getElementById('venueip');
        //     newVideo.srcObject = stream;
        //     await newVideo.play().catch(console.error);
        // });

        // ip.on('data', ({src, data}) => {
        //     console.log(data);
        // })
    });

})();

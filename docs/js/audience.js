const Peer = window.Peer;
// const strm = window.strm;
// 会場と言語の組み合わせ
// const vlProduction = ['#ao', '#ai', '#bo', '#bi', '#co', '#ci'];

(async function main(){

    // ローカルストレージにAPI Keyが保存されていればInputボックスに自動入力
    if (window.localStorage.getItem('myskyway') !== null) {
        document.getElementById('apikey').value = window.localStorage.getItem('myskyway'); 
    }

    // 会場とデフォルトのチャネル別のPeerIDを作成するための接尾辞
    // ハッシュ# 付きのURLを使用する予定
    let myLang;
    if (!location.hash) {
        myLang = 'L1';
    } else if (location.hash.substr(-1) === 'L2'){
        myLang = 'L2';
    } else {
        myLang = 'L1'
    }
    let currentLang = {
        'L1': 'ori',
        'L2': 'ip',
    };

    // 会場用の変数を用意しておく
    let main;
    let ip;
    let aud;

    const originalHeader = document.getElementById('originalH');
    const interHeader = document.getElementById('interH');
    const hostHeader = document.getElementById('hostH');
    const originalAudio = document.getElementById('original');
    const interAudio = document.getElementById('interpreter');
    const hostAudio = document.getElementById('host');
    const initBtn = document.getElementById('initBtn');
    const connectBtn = document.getElementById('connectBtn');

    const setLang1Btn = document.getElementById('lang1');
    const setLang2Btn = document.getElementById('lang2')

    // 最初の接続を行う
    initBtn.addEventListener('click', async() => {
        // Peer接続のためのコンストラクタ
        window.Peer = new Peer({
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
        // オーディエンスからは配信する内容がないので、受信専用としてstreamはnull
        aud = window.Peer.joinRoom('audience', {
            mode: 'sfu',
            stream: null,
        });

        // 会場からの音・通訳からの音をそれぞれAudioのソースに設定
        aud.on('stream', async stream => {
            console.log('set audience stream')
            const sourceId = stream.peerId;
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

        aud.on('data', ({ src, data }) => {
            switch (data.type) {
                case 'host-mute':
                    if (data.info === 'mute') {
                        hostHeader.classList.add('muted')
                    } else if (data.info === 'unmute')
                        hostHeader.classList.remove('muted')
                    break;
                
                case 'toggle-aud-lang':
                    switch (data.info.ori) {
                        case 'L1':
                            currentLang = {
                                'L1': 'ori',
                                'L2': 'ip',
                            }
                            if (myLang === 'L1') {
                                listenOriLang();
                            } else {
                                listenIpLang();
                            }
                            break;

                        case 'L2':
                            currentLang = {
                                'L1': 'ip',
                                'L2': 'ori',
                            }
                            if (myLang === 'L2') {
                                listenIpLang();
                            } else {
                                listenOriLang();
                            }
                            break;

                        case 'L0':
                            listenHost();
                            listeningLang = 'L0'
                    
                        default:
                            break;
                    }

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

    const listenOriLang = () => {
        interAudio.pause();
        interHeader.classList.remove('selected');
        hostAudio.pause();
        hostHeader.classList.remove('selected');
        
        originalAudio.play();
        originalHeader.classList.add('selected');
    }
    
    const listenIpLang = () => {
        hostAudio.pause();
        hostHeader.classList.remove('selected');
        originalAudio.pause();
        originalHeader.classList.remove('selected');
    
        interAudio.play();
        interHeader.classList.add('selected');
    }
    
    const listenHost = () => {
        originalAudio.pause();
        originalHeader.classList.remove('selected');
        interAudio.pause();
        interHeader.classList.remove('selected');
    
        hostAudio.play();
        hostHeader.classList.add('selected');
    }

    setLang1Btn.addEventListener('click', () => {
        myLang = 'L1';
        if (currentLang.L1 === 'ori') {
            listenOriLang();
        } else {
            listenIpLang();
        }
    })

    setLang2Btn.addEventListener('click', () => {
        myLang = 'L2';
        if (currentLang.L2 === 'ori') {
            listenOriLang();
        } else {
            listenIpLang();
        }
    })
    

})();
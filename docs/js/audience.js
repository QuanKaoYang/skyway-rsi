(async function main(){

    // クエリーストリングが正しければInputボックスに自動入力
    if (location.search !== '') {
        console.log(location.search.replace('?key=', ''))
        key = await getSkyKey(location.search.replace('?key=', ''));
        document.getElementById('apikey').value = key;
    // クエリーストリングがなく、ローカルストレージにapikeyが保存されていればInputボックスに自動入力
    } else if (window.localStorage.getItem('myskyway') !== null) {
        document.getElementById('apikey').value = window.localStorage.getItem('myskyway'); 
    }
    
    // 会場とデフォルトのチャネル別のPeerIDを作成するための接尾辞
    // ハッシュ# 付きのURLを使用する予定
    let myLang;
    if (!location.hash) {
        myLang = 'L1';
    } else if (location.hash === '#L2'){
        myLang = 'L2';
    } else {
        myLang = 'L1'
    }
    let currentLang = {
        'L1': 'ori',
        'L2': 'ip',
    };

    // 会場用の変数を用意しておく
    // let main;
    // let ip;
    let aud;

    const originalHeader = document.getElementById('originalH');
    const interHeader = document.getElementById('interH');
    const hostHeader = document.getElementById('hostH');
    const originalAudio = document.getElementById('original');
    const interAudio = document.getElementById('interpreter');
    const hostAudio = document.getElementById('host');
    const initBtn = document.getElementById('initBtn');
    const connectBtn = document.getElementById('connectBtn');

    const setLang1Btn = document.getElementById('lang1Btn');
    const setLang2Btn = document.getElementById('lang2Btn');
    const langDisp = document.getElementById('langDisp');

    const reloadBtn = document.getElementById('reloadBtn');

    if (myLang === 'L2') {
        setLang1Btn.classList.remove('is-primary');
        setLang2Btn.classList.add('is-primary');
    }

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
        setLang1Btn.innerText = `${mconf.lang1Name}`
        setLang2Btn.innerText = `${mconf.lang2Name}`
        langDisp.innerHTML = `Speaker: ${mconf.lang1Name}  <br /> Interpreter: ${mconf.lang2Name}`
        
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
            } else if (sourceId.startsWith('ip')){
                interAudio.srcObject = stream;
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
                            langDisp.innerHTML = `Speaker: ${mconf.lang1Name}  <br /> Interpreter: ${mconf.lang2Name}`
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
                            langDisp.innerHTML = `Speaker: ${mconf.lang2Name}  <br /> Interpreter: ${mconf.lang1Name}`
                            if (myLang === 'L1') {
                                listenIpLang();
                            } else {
                                listenOriLang();
                            }
                            break;

                        case 'L0':
                            listenHost();
                            listeningLang = 'L0'
                            break;
                    
                        default:
                            break;
                    }

                default:
                    break;
            }
        })
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
        setLang1Btn.classList.add('is-primary')
        setLang1Btn.disabled = true;
        setLang2Btn.classList.remove('is-primary');
        setLang2Btn.disabled = false;
        
        if (currentLang.L1 === 'ori') {
            listenOriLang();
        } else {
            listenIpLang();
        }
    })

    setLang2Btn.addEventListener('click', () => {
        myLang = 'L2';
        setLang2Btn.classList.add('is-primary');
        setLang2Btn.disabled = true;
        setLang1Btn.classList.remove('is-primary')
        setLang1Btn.disabled = false;

        if (currentLang.L2 === 'ori') {
            listenOriLang();
        } else {
            listenIpLang();
        }
    })

    reloadBtn.addEventListener('click', () => {
        console.log('reload');
        aud.close();
        aud.joinRoom('audience', {
            mode: 'sfu',
            stream: null,
        });
    })

})();
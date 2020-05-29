// 会場用の変数を用意しておく
let aud;

async function startConf(){
    // 会場とデフォルトのチャネル別のPeerIDを作成するための接尾辞
    // ハッシュ# 付きのURLを使用する予定
    let myLang = location.hash === '#L2' ? 'L2' : 'L1';
    let currentOriLang = 'L1';

    const initBtn = document.getElementById('initBtn');
    const connectBtn = document.getElementById('connectBtn');

    const mainVideo = document.getElementById('mainVideo');
    const subAudio = document.getElementById('subAudio');

    const setLang1Btn = document.getElementById('lang1Btn');
    const setLang2Btn = document.getElementById('lang2Btn');

    const reloadBtn = document.getElementById('reloadBtn');
    const fullScrBtn = document.getElementById('fullScrBtn');

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
        
        // 会場&通訳-オーディエンス
        // オーディエンスからは配信する内容がないので、受信専用としてstreamはnull
        aud = window.Peer.joinRoom('audience', {
            mode: 'sfu',
            stream: null,
        });

        // 会場からの音・通訳からの音をそれぞれAudioのソースに設定
        aud.on('stream', async stream => {
            if (stream.peerId.startsWith('venue')){
                mainVideo.srcObject = stream;
            } else if (stream.peerId.startsWith('ip')){
                subAudio.srcObject = stream;
            } else if (stream.peerId.startsWith('host') && stream !== null){
                subAudio.srcObject = stream;
            }
        });

        aud.on('data', ({ src, data }) => {
            switch (data.type) {
                case 'toggle-ori-lang':
                    currentOriLang = data.info.oriLang;
                    selectChanel(data.info.oriLang);

                default:
                    break;
            }
        })
    });

    setLang1Btn.addEventListener('click', () => {
        myLang = 'L1';
        selectChanel(currentOriLang);
        setLang1Btn.classList.add('is-primary');
        setLang2Btn.classList.remove('is-primary')
    });

    setLang2Btn.addEventListener('click', () => {
        myLang = 'L2';
        selectChanel(currentOriLang);
        setLang2Btn.classList.add('is-primary');
        setLang1Btn.classList.remove('is-primary')
    });

    reloadBtn.addEventListener('click', () => {
        console.log('reload');
        aud.close();
        window.Peer.joinRoom('audience', {
            mode: 'sfu',
            stream: null,
        });
    });

    fullScrBtn.addEventListener('click', () => {
        console.log('reload');
        mainVideo.requestFullscreen()
            .then(()=> {
                console.log('full');
            })
            .catch(() => {
                console.error;
            });
    });

    const selectChanel = (ch) => {
        if (myLang === ch) {
            mainVideo.muted = false;
            subAudio.muted = true;
        } else {
            mainVideo.muted = true;
            subAudio.muted = false;
        }
    }

};

(async function(){
    // クエリーストリングが正しければInputボックスに自動入力
    if (location.search !== '') {
        console.log(location.search.replace('?key=', ''))
        key = await getSkyKey(location.search.replace('?key=', ''));
        document.getElementById('apikey').value = key;
    // クエリーストリングがなく、ローカルストレージにapikeyが保存されていればInputボックスに自動入力
    } else if (window.localStorage.getItem('myskyway') !== null) {
        document.getElementById('apikey').value = window.localStorage.getItem('myskyway'); 
    }
    console.log('start');
    startConf();
})();
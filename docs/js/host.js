const Peer = window.Peer;

(async function main() {

    // ローカルストレージにapikeyが保存されていればInputボックスに自動入力
    if (window.localStorage.getItem('myskyway') !== null) {
        document.getElementById('apikey').value = window.localStorage.getItem('myskyway'); 
    }

    // 会場用の変数を用意しておく
    let main;
    let ip;
    let audience;

    // ビデオ参照用の変数を用意しておく
    let localStream;

    const initBtn = document.getElementById('initBtn');
    const createBtn = document.getElementById('createBtn');
    const setNoVenue = document.getElementById('setNoVenue');
    const setVenue1 = document.getElementById('setVenue1');
    const setVenue2 = document.getElementById('setVenue2');
    const setVenue3 = document.getElementById('setVenue3');
    const setLang0 = document.getElementById('setLang0');
    const setLang1 = document.getElementById('setLang1');
    const setLang2 = document.getElementById('setLang2');

    // 最初の接続を行う
    initBtn.addEventListener('click', async() => {
        // Peer接続のためのコンストラクタ
        // masterからの接頭辞 + 役割 + 接尾辞（ex shitianweidavenue1）
        window.Peer = new Peer(`${mconf.prefix}host`,{
            key: document.getElementById('apikey').value,
            debug: 1,
        });
        
        // ローカルストレージへのAPI Keyを保存しておく
        window.localStorage.setItem('myskyway', document.getElementById('apikey').value);
        
        initBtn.disabled = true;
        createBtn.disabled = false;
    });

    createBtn.addEventListener('click', async () => {
        if (!window.Peer.open) {
            alert('peer abort!');
            return;
        } else {
            console.log('peer succeed');
        }

        // 表示領域の変更を行う
        document.getElementById('pass').classList.add('notshow');
        document.getElementById('contents').classList.remove('notshow');

        // ビデオとオーディオを取得する
        localStream = await navigator.mediaDevices
        .getUserMedia({
            audio: true,
            video: true,
        }).catch(console.error);
    
        // roomを作っていく
        // ホスト-会場
        main = window.Peer.joinRoom('mainsession', {
            mode: 'sfu',
            stream: null,
        });

        // ホスト-通訳
        ip = window.Peer.joinRoom('interpreter', {
            mode: 'sfu',
            stream: localStream,
        })

        // ホスト-オーディエンス
        audience = window.Peer.joinRoom('audience', {
            mode: 'sfu',
            stream: localStream,
        })

        // roomに参加者が入ったとき
        // ホスト-会場
        main.on('peerJoin', peerId => {
            console.log(peerId)
        })

        main.on('stream', async stream => {
            console.log('main stream changed')
            const venId = stream.peerId.replace(mconf.prefix, '');
            const newVideo = document.getElementById(venId);
            newVideo.srcObject = stream;
            // PeerIDを属性として保存しておく
            newVideo.setAttribute('data-peer-id', stream.peerId);
            await newVideo.play().catch(console.error);
        });

        // ip.on('stream', async stream => {
        //     console.log('stream')
        // })
        ip.on('data', ({src, data}) => {
            console.log(data)
        })
    });

    setNoVenue.addEventListener('click', () => {
        main.send('no-venue');
        setNoVenue.classList.add('broadcasting')
        setVenue1.classList.remove('broadcasting');
        setVenue2.classList.remove('broadcasting');
        setVenue3.classList.remove('broadcasting');
        ip.replaceStream(null);
    });

    setVenue1.addEventListener('click', () => {
        main.send('venue1')
        setNoVenue.classList.remove('broadcasting')
        setVenue1.classList.add('broadcasting');
        setVenue2.classList.remove('broadcasting');
        setVenue3.classList.remove('broadcasting');
    });
    setVenue2.addEventListener('click', () => {
        main.send('venue2');
        setNoVenue.classList.remove('broadcasting')
        setVenue1.classList.remove('broadcasting');
        setVenue2.classList.add('broadcasting');
        setVenue3.classList.remove('broadcasting');
    });
    setVenue3.addEventListener('click', () => {
        main.send('venue3');
        setNoVenue.classList.remove('broadcasting')
        setVenue1.classList.remove('broadcasting');
        setVenue2.classList.remove('broadcasting');
        setVenue3.classList.add('broadcasting');
    });

    setLang0.addEventListener('click', () => {
        audience.send('L0');
    })
    setLang1.addEventListener('click', () => {
        audience.send('L1');
    })
    setLang2.addEventListener('click', () => {
        audience.send('L2');
    })
})();

const Peer = window.Peer;
// const strm = window.strm;

(async function main(){

    // ローカルストレージにAPI Keyが保存されていればInputボックスに自動入力
    if (window.localStorage.getItem('myskyway') !== null) {
        document.getElementById('apikey').value = window.localStorage.getItem('myskyway'); 
    }

    // 通訳者ごとにPeerIDを作成するための接尾辞
    // ハッシュ# 付きのURLを使用する予定
    const suffix = location.hash ? location.hash.replace('#', '') : '1';

    // ビデオ参照用の変数を用意しておく
    let localAudio;

    // 会場用の変数を用意しておく
    // let main;
    let ip;
    let audience;

    const localVideo = document.getElementById('venueip')
    const initBtn = document.getElementById('initBtn');
    const connectBtn = document.getElementById('connectBtn');

    // 最初の接続を行う
    initBtn.addEventListener('click', async() => {
        // Peer接続のためのコンストラクタ
        // masterからの接頭辞 + 役割 + 接尾辞（ex shitianweidainter1）
        window.Peer = new Peer(`${mconf.prefix}inter${suffix}`,{
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
        
        // マイクを取得する
        localAudio = await navigator.mediaDevices
        .getUserMedia({
            audio: true,
            video: false,
        }).catch(console.error);

        // roomに参加する
        // ホスト-会場
        // main = window.Peer.joinRoom('mainsession', {
        //     mode: 'sfu',
        //     stream: null,
        // });

        // 会場-通訳
        ip = window.Peer.joinRoom('interpreter', {
            mode: 'sfu',
            stream: null,
        });

        // 会場-オーディエンス
        audience = window.Peer.joinRoom('audience', {
            mode: 'sfu',
            stream: localAudio,
        });

        // 会場からの放送を受け取ったら放送欄を入れ替える
        ip.on('stream', async stream => {
            console.log('new broadcast')
            localVideo.srcObject = stream;
            // newVideo.playsInline = true;
            // PeerIDを属性として保存しておく
            // newVideo.setAttribute('data-peer-id', stream.peerId);
            await localVideo.play().catch(console.error);
        });

        // main.on('stream', async stream => {
        //     console.log('new main')
        //     const newVideo = document.getElementById('venueip');
        //     newVideo.srcObject = stream;
        //     await newVideo.play().catch(console.error);
        // });

        ip.on('data', ({src, data}) => {
            console.log(data);
        })
    });



})();
const Peer = window.Peer;
// const strm = window.strm;

(async function main(){

    // ローカルストレージにAPI Keyが保存されていればInputボックスに自動入力
    if (window.localStorage.getItem('myskyway') !== null) {
        document.getElementById('apikey').value = window.localStorage.getItem('myskyway'); 
    }

    // 会場ごとにPeerIDを作成するための接尾辞
    // ハッシュ# 付きのURLを使用する予定
    const suffix = location.hash ? location.hash.replace('#', '') : "1";

    // ビデオ参照用の変数を用意しておく
    let localStream;
    let localAudio;
    let screanStream;
    let screanSharing = false;
    let broadcasting = false;

    // 会場用の変数を用意しておく
    let main;
    let ip;
    let aud;

    const localVideo = document.getElementById(`venue${suffix}`);
    const initBtn = document.getElementById('initBtn');
    const connectBtn = document.getElementById('connectBtn');
    const shareScrBtn = document.getElementById('shareScrBtn');

    // 最初の接続を行う
    initBtn.addEventListener('click', async() => {
        // Peer接続のためのコンストラクタ
        // masterからの接頭辞 + 役割 + 接尾辞（ex shitianweidavenue1）
        window.Peer = new Peer(`venue${suffix}`,{
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
        
        // ビデオとオーディオを取得する
        localStream = await navigator.mediaDevices
        .getUserMedia({
            audio: true,
            video: true,
        }).catch(console.error);

        // オーディオのみを取得する
        localAudio = await navigator.mediaDevices
        .getUserMedia({
            audio: true,
            video: false,
        }).catch(console.error);

        // 自分の会場の部分をつくっていく
        localVideo.srcObject = localStream;
        await localVideo.play().catch(console.error);
        
        // roomに参加する
        // ホスト-会場
        main = window.Peer.joinRoom('mainsession', {
            mode: 'sfu',
            stream: localStream,
        });

        main.on('stream', async stream => {
            const venId = stream.peerId;
            document.getElementById(venId).srcObject = stream;
            await document.getElementById(venId).play().catch(console.error);
        });

        main.on('peerLeave', peerId => {
            console.log(`Venue Left: ${peerId}`);
            if (peerId.startsWith('venue')) {
                document.getElementById(peerId).srcObject = null;
            }
        })

        // ホストからのデータチャンネル
        main.on('data', async ({ src, data }) => {
            // 配信要請関連
            // 自会場がメインとして配信された場合以外はMuteにする
            switch (data.type) {
                case 'all-main':
                    localStream.getAudioTracks()[0].enabled = true;
                    break;

                case 'change-main':
                    const selected = data.info.substr(-1);
                    if (suffix === selected) {
                        localStream.getAudioTracks()[0].enabled = true;
                    } else {
                        localStream.getAudioTracks()[0].enabled = false;
                    }
                    break;
            
                default:
                    break;
            }
            console.log(suffix === selected)
        })

        // 会場-通訳
        // ip = window.Peer.joinRoom('interpreter', {
        //     mode: 'sfu',
        //     stream: localStream,
        // });

        // 会場-オーディエンス
        aud = window.Peer.joinRoom('audience', {
            mode: 'sfu',
            stream: localAudio,
        });
    });

    // スクリーン共有
    shareScrBtn.addEventListener('click', async () => {
        console.log('sharing')
        const screan = navigator.mediaDevices.getDisplayMedia({ video: true, audio: true }).then( async scrStream => {
            const main_ = main;
            const ip_ = ip;
            
            // 成功時にvideo要素にカメラ映像をセットし、再生
            localVideo.srcObject = scrStream;
            await localVideo.play().then(()=> {
                main_.replaceStream(scrStream);
                screanStream = scrStream;
                if (broadcasting) {
                    ip_.replaceStream(scrStream);
                }
                // screanSharing = true;
                // ip_.replaceStream(scrStream)
            }).catch(console.error);
            
            scrStream.getVideoTracks()[0].onended = ev => {
                localVideo.srcObject = localStream;
                main_.replaceStream(localStream);
                if (broadcasting) {
                    ip_.replaceStream(localStream);
                }
                scrStream = null;
                // screanSharing = false;
                // ip_.replaceStream(localStream)
            };
        });
    });
})();
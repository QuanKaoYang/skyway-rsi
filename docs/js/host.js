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

    const initBtn = document.getElementById('initBtn');
    const createBtn = document.getElementById('createBtn');

    // 最初の接続を行う
    initBtn.addEventListener('click', async() => {
        // Peer接続のためのコンストラクタ
        // masterからの接頭辞 + 役割 + 接尾辞（ex shitianweidavenue1）
        window.Peer = new Peer(`${mconf.prefix}host`,{
            key: document.getElementById('apikey').value,
            debug: 3,
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
    
        // roomを作っていく
        // ホスト-会場
        main = window.Peer.joinRoom('mainsession', {
            mode: 'sfu',
            stream: null,
        });

        // ホスト-通訳
        ip = window.Peer.joinRoom('interpreter', {
            mode: 'sfu',
            stream: null,
        })

        // ホスト-オーディエンス
        audience = window.Peer.joinRoom('audience', {
            mode: 'sfu',
            stream: null,
        })

        // roomに参加者が入ったとき
        // ホスト-会場
        main.on('peerJoin', peerId => {
            console.log(peerId)
        })

        main.on('stream', async stream => {
            const venId = stream.peerId.replace(mconf.prefix, '');
            document.getElementById(venId).srcObject = stream;
            newVideo.playsInline = true;
            // PeerIDを属性として保存しておく
            newVideo.setAttribute('data-peer-id', stream.peerId);
            await newVideo.play().catch(console.error);
        });
    })
})();

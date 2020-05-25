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
    let main;
    let ip;
    let aud;

    const mainRemote = document.getElementById('mainVenue');
    const remotes = document.getElementById('remotes');
    const initBtn = document.getElementById('initBtn');
    const connectBtn = document.getElementById('connectBtn');

    const msgs = [];
    const msg = document.getElementById('msg');
    const sendMsgBtn = document.getElementById('sendMsgBtn');

    const muteBtn = document.getElementById('mute');
    const setLang1 = document.getElementById('setLang1');
    const setLang2 = document.getElementById('setLang2');

    let ipMute = false;

    // 最初の接続を行う
    initBtn.addEventListener('click', async() => {
        // Peer接続のためのコンストラクタ
        // masterからの接頭辞 + 役割 + 接尾辞（ex shitianweidainter1）
        window.Peer = new Peer(`ip${suffix}`,{
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

        muteBtn.addEventListener('click', () => {
            if (ipMute) {
                ipMute = false;
                muteBtn.classList.remove('muted');
            } else {
                ipMute = true;
                muteBtn.classList.add('muted');
            }
        });

        setLang1.addEventListener('click', () => {
            setLang1.classList.add('selectedLang');
            setLang2.classList.remove('selectedLang');
            aud.send({
                type: 'toggle-aud-lang',
                info: {
                    ori: 'L2',
                    ip: 'L1',
                },
            });
        });

        setLang2.addEventListener('click', () => {
            setLang1.classList.remove('selectedLang');
            setLang2.classList.add('selectedLang');
            aud.send({
                type: 'toggle-aud-lang',
                info: {
                    ori: 'L1',
                    ip: 'L2',
                },
            });
        })

        // roomに参加する
        // 会場からの映像・音声を受け取るチャンネル
        // 受信専用なので stream はnull にしておく
        main = window.Peer.joinRoom('mainsession', {
            mode: 'sfu',
            stream: null,
        });

        // main.on('open', () => {
        //     console.log('opened');
        //     console.log(main.remoteStreams);
        //     console.log(Object.values(main.remoteStreams))
        //     for (const rs in main.remoteStreams) {
        //         console.log(rs)
        //         if (rs.peerId.startsWith(`venue`)) {
        //             const newRemoteLi = document.createElement('li');
        //             newRemoteLi.setAttribute('peerid', main.members[i]);
        //             const newRemoteVideo = document.createElement('video');
        //             newRemoteVideo.classList.add('minivdbox');
        //             newRemoteVideo.srcObject = rs;
        //             newRemoteVideo.playsInline = true;
        //             newRemoteLi.appendChild(newRemoteVideo);
        //             remotes.append(newRemoteVideo);
        //         }
        //     }
        // })

        main.on('stream', async stream => {
            console.log('stream');
            console.log(main.remoteStreams);
            console.log(Object.values(main.remoteStreams))
            if (stream.peerId.startsWith('venue')) {
                const newRemoteLi = document.createElement('li');
                newRemoteLi.id = `li-${stream.peerId}`;
                const newRemoteVideo = document.createElement('video');
                newRemoteVideo.classList.add('minivdbox');
                newRemoteVideo.srcObject = stream;
                newRemoteVideo.playsInline = true;
                newRemoteLi.appendChild(newRemoteVideo);
                newRemoteLi.addEventListener('click', () => {
                    console.log('venue selected')
                    selectMain(main, stream.peerId)
                });
                // newRemoteVideo.addEventListener('click', () => {
                //     console.log('venue video selected')
                //     selectMain(main, stream.peerId)
                // });
                remotes.append(newRemoteLi);
                await newRemoteVideo.play().catch(console.error);
            }
        })

        main.on('peerJoin', peerId => {
            console.log(peerId)
        });

        main.on('peerLeave', peerId => {
            if (peerId.startsWith('venue')) {
                console.log(`Venue Left: ${peerId}`);
                const remoteLis = remotes.childNodes
                for (const remoteLi of remoteLis) {
                    if (remoteLi.peerId === peerId) {
                        remotes.removeChild(remoteLi);
                        break;
                    }
                }
            }
        });

        // 会場からの放送を受け取ったら放送欄を入れ替える
        main.on('data', ({src, data}) => {
            switch (data.type) {
                case 'change-main':
                    selectMain(main, data.info);
                    break;

                case 'all-main':
                    break;
            
                default:
                    break;
            }
        });

        // 通訳者の間
        // 声とテキストデータのやり取りを想定
        ip = window.Peer.joinRoom('interpreter', {
            mode: 'sfu',
            stream: localAudio,
        });

        // ip roomのデータチャンネル
        ip.on('data', ({src, data}) => {
            switch (data.type) {
                // テキストチャット
                case 'msg':
                    msg.innerText = updateDisplayText(msgs, data.info);
                    break;
            
                default:
                    break;
            }
        });

        sendMsgBtn.addEventListener('click', () => {
            const text = document.getElementById('sendMsg').value;
            msg.innerText = updateDisplayText(msgs, text);
            ip.send({
                type: 'msg',
                info: text,
            });
            document.getElementById('sendMsg').value = '';
        })

        // 会場-オーディエンス
        aud = window.Peer.joinRoom('audience', {
            mode: 'sfu',
            stream: localAudio,
        });

        aud.on('peerJoin', () => {
            aud.replaceStream(localAudio);
        })
    });

})();

async function selectMain(room, info) {
    console.log(room.remoteStreams);
    if (info === 'none') {
        room.remote.srcObject = null;
    } else {
        for (const rs of Object.values(room.remoteStreams)) {
            if (rs.peerId === info) {
                document.getElementById(`li-${rs.peerId}`).classList.add('selectedVideo')
                document.getElementById('mainVenue').srcObject = rs;
                await document.getElementById('mainVenue').play().catch(console.error);
                // break;
            } else {
                document.getElementById(`li-${rs.peerId}`).classList.remove('selectedVideo')
            }
        }
    }
}

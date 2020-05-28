// const Peer = window.Peer;
// const strm = window.strm;

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

    // 通訳者ごとにPeerIDを作成するための接尾辞
    // ハッシュ# 付きのURLを使用する予定
    const suffix = location.hash ? location.hash.replace('#', '') : '1';

    // ビデオ参照用の変数を用意しておく
    let localAudio;

    // 会場用の変数を用意しておく
    let main;
    let ip;
    let aud;

    const mainRemote = document.getElementById('mainVideo');
    const remotes = document.getElementById('remotes');
    const initBtn = document.getElementById('initBtn');
    const connectBtn = document.getElementById('connectBtn');

    const msgs = [];
    const msg = document.getElementById('msg');
    const sendMsgBtn = document.getElementById('sendMsgBtn');

    const muteBtn = document.getElementById('mute');
    const setLang1Btn = document.getElementById('setLang1Btn');
    const setLang2Btn = document.getElementById('setLang2Btn');

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
        setLang1Btn.innerText = `${mconf.lang1Name}`
        setLang2Btn.innerText = `${mconf.lang2Name}`
        
        // マイクを取得する
        localAudio = await getMediaStream({video: false, audio: true});

        muteBtn.addEventListener('click', () => {
            // ミュートがON => ミュート解除
            if (ipMute) {
                ipMute = false;
                localAudio.getAudioTracks()[0].enabled = true;
                muteBtn.classList.remove('is-danger');
                main.send({
                    type: 'unmute',
                })
            // ミュートがOFF => ミュート
            } else {
                ipMute = true;
                localAudio.getAudioTracks()[0].enabled = false;
                muteBtn.classList.add('is-danger');
                main.send({
                    type: 'mute',
                })
            }
        });

        setLang1Btn.addEventListener('click', () => {
            setLang1Btn.classList.add('is-primary');
            setLang2Btn.classList.remove('is-primary');
            aud.send({
                type: 'toggle-aud-lang',
                info: {
                    ori: 'L2',
                    ip: 'L1',
                },
            });
        });

        setLang2Btn.addEventListener('click', () => {
            setLang1Btn.classList.remove('is-primary');
            setLang2Btn.classList.add('is-primary');
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

        main.on('stream', async stream => {
            if (stream.peerId.startsWith('venue')) {
                const newRemoteLi = document.createElement('li');
                newRemoteLi.id = `li-${stream.peerId}`;
                const newRemoteVideo = document.createElement('video');
                newRemoteVideo.classList.add('miniVdbox');
                newRemoteVideo.srcObject = stream;
                newRemoteVideo.playsInline = true;
                newRemoteLi.appendChild(newRemoteVideo);
                newRemoteLi.addEventListener('click', () => {
                    console.log('venue selected')
                    selectMain(main, stream.peerId)
                });
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
                    if (remoteLi.id === `li-${peerId}`) {
                        remotes.removeChild(remoteLi);
                        break;
                    }
                }
                if (mainRemote.getAttribute('pid') === peerId) {
                    mainRemote.srcObject = null;
                    mainRemote.setAttribute('pid', '');
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
                    msg.innerText = updateDisplayText(msgs, data.info, 20);
                    break;
            
                default:
                    break;
            }
        });

        sendMsg.addEventListener('keyup', ev => {
            if (ev.keyCode === 13) {
                const text = document.getElementById('sendMsg').value;
                msg.innerText = updateDisplayText(msgs, text, 20);
                ip.send({
                    type: 'msg',
                    info: text,
                });
                document.getElementById('sendMsg').value = '';
            }
        })

        sendMsgBtn.addEventListener('click', () => {
            const text = document.getElementById('sendMsg').value;
            msg.innerText = updateDisplayText(msgs, text, 20);
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

        aud.on('data', ({src, data}) => {
            switch (data.type) {
               case 'toggle-aud-lang':
                    switch (data.info.ori) {
                        case 'L0':
                            ipMute = true;
                            localAudio.getAudioTracks()[0].enabled = false;
                            muteBtn.classList.add('is-danger');
                            msg.innerText = updateDisplayText(msgs, '@host speaking', 20);
                            break;

                        case 'L1':
                            ipMute = false;
                            localAudio.getAudioTracks()[0].enabled = true;
                            muteBtn.classList.remove('is-danger');
                            setLang1Btn.classList.remove('is-primary');
                            setLang2Btn.classList.add('is-primary');
                            msg.innerText = updateDisplayText(msgs, 'lang toggled by @host', 20);
                            break;
                        
                        case 'L2':
                            ipMute = false;
                            localAudio.getAudioTracks()[0].enabled = true;
                            muteBtn.classList.remove('is-danger');
                            setLang1Btn.classList.add('is-primary');
                            setLang2Btn.classList.remove('is-primary');
                            msg.innerText = updateDisplayText(msgs, 'lang toggled by @host', 20);
                            break;
                    
                        default:
                            break;
                    }
                    break;
                
                default:
                    break;
            }
        })
    });

})();

async function selectMain(room, info) {
    if (info === 'none') {
        room.remote.srcObject = null;
    } else {
        for (const rs of Object.values(room.remoteStreams)) {
            if (rs.peerId === info) {
                document.getElementById(`li-${rs.peerId}`).classList.add('currentVdbox')
                document.getElementById('mainVideo').srcObject = rs;
                document.getElementById('mainVideo').setAttribute('pid', info)
                await document.getElementById('mainVideo').play().catch(console.error);
            } else {
                document.getElementById(`li-${rs.peerId}`).classList.remove('currentVdbox')
            }
        }
    }
}

const Peer = window.Peer;

(async function main() {

    // ローカルストレージにapikeyが保存されていればInputボックスに自動入力
    if (window.localStorage.getItem('myskyway') !== null) {
        document.getElementById('apikey').value = window.localStorage.getItem('myskyway'); 
    }

    // 会場用の変数を用意しておく
    let main;
    let ip;
    let aud;
    let currentOriLang;

    // ビデオ参照用の変数を用意しておく
    let localStream;

    const initBtn = document.getElementById('initBtn');
    const createBtn = document.getElementById('createBtn');
    const setNoVenue = document.getElementById('setNoVenue');
    const setVenue1 = document.getElementById('setVenue1');
    const setVenue2 = document.getElementById('setVenue2');
    const setVenue3 = document.getElementById('setVenue3');
    
    const setLang0 = document.getElementById('setLang0');
    const muteLang0 = document.getElementById('muteLang0');
    let hostMuted = false;
    const setLang1 = document.getElementById('setLang1');
    const setLang2 = document.getElementById('setLang2');

    const statuses = [];
    const status = document.getElementById('console');
    const msgs = [];
    const msg = document.getElementById('msg')
    const sendMsgBtn = document.getElementById('sendMsgBtn')

    // 最初の接続を行う
    initBtn.addEventListener('click', async() => {
        // Peer接続のためのコンストラクタ
        // masterからの接頭辞 + 役割 + 接尾辞（ex shitianweidavenue1）
        window.Peer = new Peer(`host`,{
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
        // man = ホスト-会場
        main = window.Peer.joinRoom('mainsession', {
            mode: 'sfu',
            stream: null,
        });

        // main roomに参加者が入ったとき
        // ビデオに関する処理は stream のイベントで処理をする
        main.on('peerJoin', peerId => {
            // console.log(`Venue Joined: ${peerId}`);
            status.innerText = updateDisplayText(statuses, `Venue Joined: ${peerId}`);
        });

        // main roomにストリーム付きで参加者が入ったとき
        main.on('stream', async stream => {
            // console.log('main stream changed')
            const subPeerid = stream.peerId;
            if (subPeerid.startsWith('venue')) {
                document.getElementById(subPeerid).srcObject = stream;
                await document.getElementById(subPeerid).play().catch(console.error)
                // PeerIDを属性として保存しておく
                // newVideo.setAttribute('data-peer-id', stream.peerId);
            }
        });

        // main roomに参加者が入ったとき
        main.on('peerLeave', peerId => {
            console.log(`Venue Left: ${peerId}`);
            status.innerText = updateDisplayText(statuses, `Venue Left: ${peerId}`);
            const subPeerid = peerId;
            if (subPeerid.startsWith('venue')) {
                document.getElementById(subPeerid).srcObject = null;
            }
        });

        // ip 通訳者間　ホストも音声を送れる
        ip = window.Peer.joinRoom('interpreter', {
            mode: 'sfu',
            stream: localStream,
        });

        // ip roomに通訳者が入ったとき
        // ビデオに関する処理は stream のイベントで処理をする
        // #TODO 通訳者の音声をモニターする処理
        ip.on('peerJoin', peerId => {
            console.log(`Interpreter Joined: ${peerId}`);
            status.innerText = updateDisplayText(statuses, `Interpreter Joined: ${peerId}`);
        });

        // ip roomから通訳者が出たとき
        ip.on('peerLeave', peerId => {
            console.log(`Interpreter Left: ${peerId}`);
            status.innerText = updateDisplayText(statuses, `Interpreter Left: ${peerId}`);
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
            ip.send({
                type: 'msg',
                info: text,
            });
            msg.innerText = updateDisplayText(msgs, text);
            document.getElementById('sendMsg').value = '';
        })

        // aud 聴衆用
        // mainとipからそれぞれ音声を送り込む
        // hostからも一応は送れるようにしておく
        aud = window.Peer.joinRoom('audience', {
            mode: 'sfu',
            stream: localStream,
        })

        // aud roomに参加者が入ったとき
        // ビデオに関する処理は stream のイベントで処理をする
        aud.on('peerJoin', peerId => {
            console.log(`Audience Joined: ${peerId}`);
            status.innerText = updateDisplayText(statuses, `Audience Joined: ${peerId}`);
            // hostの音源がミュート状態か確認
            // my-トであれば入ってきた聴衆のホストaudioを無効化しておく
            const muteState = hostMuted ? 'mute' : 'unmute';
            aud.send({
                type: 'host-mute',
                info: muteState
            });
        })

        // aud roomから聴衆が出たとき
        aud.on('peerLeave', peerId => {
            status.innerText = updateDisplayText(statuses, `Audience Left: ${peerId}`);
        });

        aud.on('data', ({src, data}) => {
            switch (data.type) {
                case 'toggle-aud-lang':
                    switch (data.info.ori) {
                        case 'L0':
                            setLang0.classList.add('broadcasting');
                            setLang1.classList.remove('broadcasting');
                            setLang2.classList.remove('broadcasting');
                            currentOriLang = 'L0';
                            break;

                        case 'L1':
                            setLang0.classList.remove('broadcasting');
                            setLang1.classList.add('broadcasting');
                            setLang2.classList.remove('broadcasting');
                            currentOriLang = 'L1';
                            break;
                        
                        case 'L2':
                            setLang0.classList.remove('broadcasting');
                            setLang1.classList.remove('broadcasting');
                            setLang2.classList.add('broadcasting');
                            currentOriLang = 'L2';
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

    setNoVenue.addEventListener('click', () => {
        main.send({
            type: 'all-main',
            info: 'none',
        });
        setNoVenue.classList.add('broadcasting')
        setVenue1.classList.remove('broadcasting');
        setVenue2.classList.remove('broadcasting');
        setVenue3.classList.remove('broadcasting');
        // ip.replaceStream(null);
    });

    setVenue1.addEventListener('click', () => {
        main.send({
            type: 'change-main',
            info: 'venue1',
        })
        setNoVenue.classList.remove('broadcasting')
        setVenue1.classList.add('broadcasting');
        setVenue2.classList.remove('broadcasting');
        setVenue3.classList.remove('broadcasting');
    });
    setVenue2.addEventListener('click', () => {
        main.send({
            type: 'change-main',
            info: 'venue2',
        })
        setNoVenue.classList.remove('broadcasting')
        setVenue1.classList.remove('broadcasting');
        setVenue2.classList.add('broadcasting');
        setVenue3.classList.remove('broadcasting');
    });
    setVenue3.addEventListener('click', () => {
        main.send({
            type: 'change-main',
            info: 'venue3',
        });
        setNoVenue.classList.remove('broadcasting')
        setVenue1.classList.remove('broadcasting');
        setVenue2.classList.remove('broadcasting');
        setVenue3.classList.add('broadcasting');
    });

    setLang0.addEventListener('click', () => {
        aud.send({
            type: 'toggle-aud-lang',
            info: {
                ori: 'L0',
                ip: 'L0',
            },
        });
        setLang0.classList.add('broadcasting');
        setLang1.classList.remove('broadcasting')
        setLang2.classList.remove('broadcasting')
    });

    muteLang0.addEventListener('click', () => {
        if (hostMuted) {
            localStream.getAudioTracks()[0].enabled = true;
            muteLang0.classList.remove('muted');
            hostMuted = false;
            aud.send({
                type: 'host-mute',
                info: 'unmute'
            });
        } else {
            localStream.getAudioTracks()[0].enabled = false;
            muteLang0.classList.add('muted');
            hostMuted = true;
            aud.send({
                type: 'host-mute',
                info: 'mute'
            });
        }
    })

    setLang1.addEventListener('click', () => {
        console.log('L1')
        aud.send({
            type: 'toggle-aud-lang',
            info: {
                ori: 'L1',
                ip: 'L2',
            },
        });
        setLang0.classList.remove('broadcasting');
        setLang1.classList.add('broadcasting')
        setLang2.classList.remove('broadcasting')
    })
    setLang2.addEventListener('click', () => {
        aud.send({
            type: 'toggle-aud-lang',
            info: {
                ori: 'L1',
                ip: 'L2',
            },
        });
        setLang0.classList.remove('broadcasting');
        setLang1.classList.remove('broadcasting')
        setLang2.classList.add('broadcasting')
    })
})();

// function updateDisplayText(oldTexts, newText) {
//     oldTexts.push(newText);
//     if (oldTexts.length >= 20) {
//         oldTexts.shift();
//     }
//     return oldTexts.join('\n');
// }
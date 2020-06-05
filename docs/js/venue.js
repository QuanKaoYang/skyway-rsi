// 会場用の変数を用意しておく
let main;
// let aud;

async function startConf(){
    // 会場ごとにPeerIDを作成する
    const self = location.hash ? `venue${location.hash.replace('#', '')}` : 'venue1';

    // ビデオ参照用の変数を用意しておく
    let localStream;
    let localAudio;
    let screanStream;
    let currentOriLang = 'L1';
    let currentVenue = 'venue0';
    let currentIp = 'ip1';
    let broadcasting = false;

    const localVideo = document.getElementById(self);
    const connectBtn = document.getElementById('connect-btn');

    const shareScrBtn = document.getElementById('shareScr-btn');
    const broadcastBtn = document.getElementById('broadcast-btn');

    // 最初の接続を行う
    document.getElementById('login-btn').addEventListener('click', () => {
        const name = document.getElementById('name').value;
        // const user = document.getElementById('user').value;
        const pw = document.getElementById('password').value;
        login({
            name: name,
            user: 'venue',
            pw: pw,
        }).then(t => {
            // Peer接続のためのコンストラクタ
            window.Peer = new Peer(self,{
                key: t,
                debug: 1,
            });
            document.getElementById('login-msg').innerText = "Login Succeed"
            setTimeout(() => {
                connectBtn.disabled = false;
            }, 1000);
        }).catch(failed => {
            document.getElementById('login-msg').innerText = failed
        });
    })

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
        localStream = await getMediaStream({video: true, audio: true});

        // オーディオのみを取得する
        localAudio = await getMediaStream({video: false, audio: true});
        
        // 自分の会場の部分をつくっていく
        localVideo.srcObject = localStream;
        localVideo.muted = true;
        await localVideo.play().catch(console.error);

        const changeParam = () => {
            main.send({
                type: 'change-params',
                info: {
                    oriLang: currentOriLang,
                    venue: currentVenue,
                    ip: currentIp,
                },
            });
        }
        
        // roomに参加する
        // ホスト-会場
        main = window.Peer.joinRoom('mainsession', {
            mode: 'sfu',
            stream: localStream,
        });

        main.on('open', () => {
            if (main.members > 0) {
                main.send({
                    type: 'initial-check',
                    who: main.members[0],
                });
            }
        })

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
            console.log(data);
            // 配信要請関連
            // 自会場がメインとして配信された場合以外はMuteにする
            switch (data.type) {
                case 'initial-check':
                    if (data.who === self){
                        changeParam();
                    }
                    break;
                
                case 'all-main':
                    localStream.getAudioTracks()[0].enabled = true;
                    break;

                case 'change-params':
                    if (data.info.venue !== currentVenue) {
                        currentVenue = data.info.venue;
                        if (self === data.info.venue) {
                            broadcastBtn.click();
                            // broadcasting = true;
                        } else {
                            if (broadcasting) {
                                broadcastBtn.click();
                            }
                            localStream.getAudioTracks()[0].enabled = false;
                        }
                    }

                    if (data.info.oriLang !== currentOriLang){
                        currentOriLang = data.info.oriLang;
                    }

                    if (data.info.ip !== currentIp) {
                        currentOriLang = data.info.ip;
                    }
                    
                    break;
                
                default:
                    break;
            }
        })

        // スクリーン共有
        shareScrBtn.addEventListener('click', async () => {
            console.log('sharing')
            navigator.mediaDevices.getDisplayMedia({ video: true, audio: true }).then( async scrStream => {
                const main_ = main;
                // const aud_ = currentOriLang === 'L1' ? aud : aud2;
                const combinedStream = new MediaStream(
                    [...scrStream.getTracks(), ...localAudio.getTracks()]
                )
                
                // 成功時にvideo要素にカメラ映像をセットし、再生
                localVideo.srcObject = combinedStream;
                await localVideo.play().then(()=> {
                    main_.replaceStream(combinedStream);
                    screanStream = combinedStream;
                }).catch(console.error);
                
                scrStream.getVideoTracks()[0].onended = async () => {
                    localStream = await getMediaStream({video: true, audio: true});
                    localVideo.srcObject = localStream;
                    main_.replaceStream(localStream);
                    scrStream = null;
                };
            });
        });
        
        broadcastBtn.addEventListener('click', ev => {
            if (!broadcasting) {
                if (ev.isTrusted === true){
                    currentVenue = self;
                    changeParam();
                }
                localStream.getAudioTracks()[0].enabled = true;
                broadcasting = true;
                broadcastBtn.innerText = 'BROADCASTING NOW...';
                broadcastBtn.classList.add('is-danger');
                broadcastBtn.classList.remove('is-primary');
            } else {
                if (ev.isTrusted === true){
                    currentVenue = 'venue0';
                    changeParam();
                    localStream.getAudioTracks()[0].enabled = false;
                }
                broadcasting = false;
                broadcastBtn.innerText = 'BROADCAST';
                broadcastBtn.classList.add('is-primary');
                broadcastBtn.classList.remove('is-danger');
            }
        });

    });
};

(async function(){
    console.log('start');
    startConf();
})();
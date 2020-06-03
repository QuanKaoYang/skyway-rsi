// 会場用の変数を用意しておく
let ip;
let myTurn = false;

async function startConf(){
    // 通訳者ごとにPeerIDを作成する
    const self = location.hash ? `ip${location.hash.replace('#', '')}` : 'ip1';
    let ips = [self];
    let asking = false;
    let acceptance;

    // 音声参照用の変数を用意しておく
    let localAudio;

    let currentOriLang = 'L0';
    let currentVenue = 'venue0';
    let currentIp = 'ip1';

    const mainRemote = document.getElementById('mainVideo');
    const initBtn = document.getElementById('initBtn');
    const connectBtn = document.getElementById('connectBtn');

    const msgs = [];
    const msg = document.getElementById('msg');
    const sendMsgBtn = document.getElementById('sendMsgBtn');

    const handOverBtn = document.getElementById('handOverBtn')
    const muteBtn = document.getElementById('mute');
    let ipMute = false;
    let speakingIp = 'ip1';

    const setLang1Btn = document.getElementById('setLang1Btn');
    const setLang2Btn = document.getElementById('setLang2Btn');

    // 最初の接続を行う
    initBtn.addEventListener('click', async() => {
        // Peer接続のためのコンストラクタ
        window.Peer = new Peer(self, {
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
        setLang1Btn.innerText = `${mconf.lang1Name}`;
        setLang2Btn.innerText = `${mconf.lang2Name}`;
        
        // マイクを取得する
        localAudio = await getMediaStream({video: false, audio: true});

        muteBtn.addEventListener('click', () => {
            // ミュートがON => ミュート解除
            if (ipMute) {
                unmuting()
                ip.send({
                    type: 'ip-unmute',
                })
            // ミュートがOFF => ミュート
            } else {
                muting(false);
                ip.send({
                    type: 'ip-mute',
                })
            }
        });

        const changeParam = () => {
            ip.send({
                type: 'change-params',
                info: {
                    oriLang: currentOriLang,
                    venue: currentVenue,
                    ip: currentIp,
                },
            });
        }

        setLang1Btn.addEventListener('click', () => {
            setLang1Btn.classList.add('is-primary');
            setLang2Btn.classList.remove('is-primary');
            currentOriLang = 'L2';
            changeParam();
        });

        setLang2Btn.addEventListener('click', () => {
            setLang1Btn.classList.remove('is-primary');
            setLang2Btn.classList.add('is-primary');
            currentOriLang = 'L1';
            changeParam();
        })

        // roomに参加する
        // 会場からの映像・音声を受け取るチャンネル
        // 受信専用なので stream はnull にしておく
        ip = window.Peer.joinRoom('ip', {
            mode: 'sfu',
            stream: localAudio,
        });

        ip.on('open', () => {
            // 先に通訳者がいた場合、後から入った方のページではマイクをOFFにする
            let hasHost = false
            for (const m of ip.members) {
                if (m.startsWith('ip')) {
                    ips.push(m);
                } else if (m === 'host') {
                    hasHost = true
                }
            }
            ips.sort();
            if (!hasHost) {
                if (ips.length === 1) {
                    myTurn = true;
                }
                getTurn(myTurn);
            }
        })

        ip.on('stream', async stream => {
            mainRemote.srcObject = stream;
            await mainRemote.play().catch(console.error);
        });

        // 他の通訳が参加したことを検知する
        ip.on('peerJoin', peerId => {
            if (peerId.startsWith('ip')) {
                msg.innerText = updateDisplayText(msgs, `Other Interpreter Joined: ${peerId}`, 20);
                ips.push(peerId);
                ips.sort();
            }
            getTurn(myTurn);
        })

        // 接続が減った場合の処理
        ip.on('peerLeave', peerId => {
            if (peerId.startsWith('ip')) {
                console.log(`Interpreter Left: ${peerId}`);
                ips = ips.filter(val => {
                    return val !== peerId;
                });
                ips.sort();
                if (peerId === speakingIp) {
                    speakingIp = ips[0];
                    if (speakingIp === self) {
                        myTurn = true;
                    }
                }
                getTurn(myTurn);
            }
        });

        // データのやり取り
        ip.on('data', ({src, data}) => {
            console.log(data);
            switch (data.type) {
                
                case 'msg':
                    msg.innerText = updateDisplayText(msgs, data.info, 20);
                    break;
                
                case 'change-params':
                    if (data.info.venue !== currentVenue) {
                        currentVenue = data.info.venue;
                        // selectMain();
                    }
                    if (data.info.oriLang !== currentOriLang) {
                        currentOriLang = data.info.oriLang;
                        switch(currentOriLang) {
                            case 'L0':
                                setOriL0();
                                break;
                            case 'L1':
                                setOriL1();
                                break;
                            case 'L2':
                                setOriL2();
                                break;
                            default:
                                break;
                        }
                    }
                    if (data.info.ip !== currentIp) {
                        currentIp = data.info.ip;
                    }
                    if (currentIp === self) {
                        myTurn = true;
                    } else {
                        myTurn = false;
                    }
                    getTurn(myTurn)
                    break;

                case 'hand-over':
                    if (data.to === self) {
                        acceptance = setTimeout(rejectHandle, 10000);
                        asking = true;
                        handOverBtn.disabled = false;
                        handOverBtn.classList.remove('is-black')
                        handOverBtn.classList.add('is-white')
                    }

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

        handOverBtn.addEventListener('click', () => {
            if (!asking) {
                const targetIp = self === 'ip1' ? 'ip2' : 'ip1';
                ip.send({
                    type: 'hand-over',
                    from: self,
                    to: targetIp,
                });
            } else {
                clearTimeout(acceptance);
                currentIp = self;
                changeParam();
                asking = false;
                myTurn = true;
                getTurn(myTurn)
                // ip.send({
                //     type: 'hand-over-ok',
                //     to: self,
                // });
                handOverBtn.classList.add('is-black')
                handOverBtn.classList.remove('is-white')
            }
        })

        const rejectHandle = () => {
            console.log('reject')
            ip.send({
                type: 'msg',
                info: `${self} cannot accept right now`
            })
            asking = false;
            handOverBtn.disabled = true;
            handOverBtn.classList.add('is-black')
            handOverBtn.classList.remove('is-white')
            console.log('reject end')
        }

    });

    const setOriL0 = () => {
        currentOriLang = 'L0';
        ipMute = true;
        localAudio.getAudioTracks()[0].enabled = false;
        muteBtn.classList.add('is-danger');
        msg.innerText = updateDisplayText(msgs, '@host speaking', 20);
    }

    const setOriL1 = () => {
        currentOriLang = 'L1';
        ipMute = false;
        localAudio.getAudioTracks()[0].enabled = true;
        muteBtn.classList.remove('is-danger');
        setLang1Btn.classList.remove('is-primary');
        setLang2Btn.classList.add('is-primary');
        msg.innerText = updateDisplayText(msgs, 'lang toggled by @host', 20);
    }

    const setOriL2 = () => {
        currentOriLang = 'L2';
        ipMute = false;
        localAudio.getAudioTracks()[0].enabled = true;
        muteBtn.classList.remove('is-danger');
        setLang1Btn.classList.add('is-primary');
        setLang2Btn.classList.remove('is-primary');
        msg.innerText = updateDisplayText(msgs, 'lang toggled by @host', 20);
    }

    const getTurn = (turn) => {
        console.log(turn)
        if (turn) {
            unmuting();
            setLang1Btn.disabled = false;
            setLang2Btn.disabled = false;
            if (ips.length > 1) {
                handOverBtn.disabled = false;
            } else {
                handOverBtn.disabled = true;
            }
        } else {
            muting(true);
            setLang1Btn.disabled = true;
            setLang2Btn.disabled = true;
            handOverBtn.disabled = true;
        }
    }
    const muting = (lock) => {
        ipMute = true;
        localAudio.getAudioTracks()[0].enabled = false;
        muteBtn.classList.add('is-danger');
        muteBtn.disabled = lock;
        muteLock = lock;
    }
    
    const unmuting = () => {
        ipMute = false;
        localAudio.getAudioTracks()[0].enabled = true;
        muteBtn.classList.remove('is-danger');
        muteBtn.disabled = false;
        muteLock = false;
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


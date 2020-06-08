// 会場用の変数を用意しておく
let ip;
let myTurn = false;

async function startConf(){
    // 通訳者ごとにPeerIDを作成する
    const self = location.hash ? `ip${location.hash.replace('#', '')}` : 'ip1';
    let ips = [self];
    let acceptance;
    let acceptLimit;

    // 音声参照用の変数を用意しておく
    let localAudio;

    let currentOriLang = 'L0';
    let currentVenue = 'venue0';
    let currentIp = 'ip1';

    const mainRemote = document.getElementById('main-video');
    const connectBtn = document.getElementById('connect-btn');

    const msgs = [];
    const msg = document.getElementById('msg');
    const sendMsgBtn = document.getElementById('sendMsg-btn');

    const handOverBtn = document.getElementById('handOver-btn');
    const muteBtn = document.getElementById('mute');
    let ipMute = false;

    const setLang1Btn = document.getElementById('setLang1-btn');
    const setLang2Btn = document.getElementById('setLang2-btn');

    // 最初の接続を行う
    document.getElementById('password').addEventListener('keyup', ev => {
        if (ev.keyCode === 13) {
            document.getElementById('login-btn').click();
        }
    })

    document.getElementById('login-btn').addEventListener('click', () => {
        const name = document.getElementById('name').value;
        // const user = document.getElementById('user').value;
        const pw = document.getElementById('password').value;
        login({
            name: name,
            user: 'interpreter',
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
        setLang1Btn.innerText = `${mconf.lang1Name}`;
        setLang2Btn.innerText = `${mconf.lang2Name}`;
        
        // マイクを取得する
        localAudio = await getMediaStream({video: false, audio: true});

        const reqestBtn = document.getElementById('request-btn');
        reqestBtn.addEventListener('click', () => {
            ip.send({
                type: 'msg',
                info: {
                    text: `${self} requests to hand over`,
                    color: 'bg-yellow'
                }
            });
        });

        const acceptBtn = document.getElementById('accept-btn');
        acceptBtn.addEventListener('click', () => {
            clearTimeout(acceptance);
            document.getElementById('hand-modal').classList.toggle('is-active');
            currentIp = self;
            ip.send({
                type: 'hand-accept',
                to: self,
            })
            myTurn = true;
            getTurn();
        });

        const rejectHandle = () => {
            clearTimeout(acceptance);
            ip.send({
                type: 'hand-reject',
            })
            document.getElementById('hand-modal').classList.toggle('is-active');
        }

        const rejectBtn = document.getElementById('reject-btn');
        rejectBtn.addEventListener('click', rejectHandle);

        const delBtn = document.getElementById('del-btn');
        delBtn.addEventListener('click', () => {
            document.getElementById('hand-modal').classList.toggle('is-active')
        });

        muteBtn.addEventListener('click', () => {
            // ミュートがON => ミュート解除
            if (ipMute) {
                unmuting();
                ip.send({
                    type: 'ip-unmute',
                });
            // ミュートがOFF => ミュート
            } else {
                muting(false);
                ip.send({
                    type: 'ip-mute',
                });
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
        });

        // roomに参加する
        // 会場からの映像・音声を受け取るチャンネル
        // 受信専用なので stream はnull にしておく
        ip = window.Peer.joinRoom('ip', {
            mode: 'sfu',
            stream: localAudio,
        });

        ip.on('open', () => {
            if (ip.members > 0) {
                ip.members.map(val => {
                    if (val !== 'host') {
                        ips.push(val);
                    };
                });
                ip.send({
                    type: 'initial-check',
                    who: ip.members[0],
                    exeption: ips.length === 1 ? true : false,
                })
            }
            console.log(ips)
            myTurn = ips.length === 1? true : false;
            getTurn()
        });

        ip.on('stream', async stream => {
            if (stream.peerId === 'host') {
                mainRemote.srcObject = stream;
                await mainRemote.play().catch(console.error);
            }
        });

        // 他の通訳が参加したことを検知する
        ip.on('peerJoin', peerId => {
            if (peerId.startsWith('ip')) {
                // msg.innerText = updateDisplayText(msgs, `Other Interpreter Joined: ${peerId}`, 20);
                msg.innerHTML = coloredLog(msgs, `Other Interpreter Joined: ${peerId}`, 20, 'bg-yellow');
                ips.push(peerId);
                ips.sort();
            }
            getTurn();
        });

        // 接続が減った場合の処理
        ip.on('peerLeave', peerId => {
            if (peerId.startsWith('ip')) {
                msg.innerHTML = coloredLog(msgs, `Other Interpreter Left: ${peerId}`, 20, 'bg-yellow');
                ips = ips.filter(val => {
                    return val !== peerId;
                });
                ips.sort();
                if (peerId === currentIp) {
                    currentIp = ips[0];
                    if (currentIp === self) {
                        myTurn = true;
                    }
                }
                getTurn();
            }
        });

        // データのやり取り
        ip.on('data', ({src, data}) => {
            console.log(data);
            switch (data.type) {
                case 'initial-check':
                    if (data.who === self){
                        changeParam();
                    }
                    break;

                case 'msg':
                    msg.innerHTML = coloredLog(msgs, data.info.text, 20, data.info.color);
                    break;
                
                case 'change-params':
                    if (data.info.venue !== currentVenue) {
                        currentVenue = data.info.venue;
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
                    getTurn();
                    break;

                case 'hand-over':
                    if (data.to === self) {
                        acceptance = setTimeout(rejectHandle, 10000);
                        document.getElementById('hand-modal').classList.toggle('is-active');
                    }
                    break;

                case 'hand-accept':
                    myTurn = false;
                    getTurn();
                    handOverBtn.innerText = 'HAND OVER';
                    handOverBtn.classList.add('is-black');
                    handOverBtn.classList.remove('is-white');
                    break;

                case 'hand-reject':
                    msg.innerText = updateDisplayText(msgs, `${src} cannot accept right now`, 20);
                    handOverBtn.disabled = false;
                    handOverBtn.innerText = 'HAND OVER';
                    handOverBtn.classList.add('is-black');
                    handOverBtn.classList.remove('is-white');

                default:
                    break;
            }
        });

        sendMsgBtn.addEventListener('click', () => {
            const text = document.getElementById('sendMsg').value;
            // msg.innerText = updateDisplayText(msgs, text, 20);
            msg.innerHTML = coloredLog(msgs, text, 20);
            ip.send({
                type: 'msg',
                info: {
                    text
                },
            });
            document.getElementById('sendMsg').value = '';
        });

        sendMsg.addEventListener('keyup', ev => {
            if (ev.keyCode === 13) {
                sendMsgBtn.click();
            }
        });

        handOverBtn.addEventListener('click', () => {
            const targetIp = self === 'ip1' ? 'ip2' : 'ip1';
            ip.send({
                type: 'hand-over',
                from: self,
                to: targetIp,
            });
            handOverBtn.disabled = true;
            handOverBtn.innerText = 'Waiting...'
            handOverBtn.classList.remove('is-black');
            handOverBtn.classList.add('is-white');
        });

    });

    const setOriL0 = () => {
        currentOriLang = 'L0';
        ipMute = true;
        localAudio.getAudioTracks()[0].enabled = false;
        muteBtn.classList.add('is-danger');
        // msg.innerText = updateDisplayText(msgs, '@host speaking', 20);
    };

    const setOriL1 = () => {
        currentOriLang = 'L1';
        ipMute = false;
        localAudio.getAudioTracks()[0].enabled = true;
        muteBtn.classList.remove('is-danger');
        setLang1Btn.classList.remove('is-primary');
        setLang2Btn.classList.add('is-primary');
        // msg.innerText = updateDisplayText(msgs, 'lang toggled by @host', 20);
    };

    const setOriL2 = () => {
        currentOriLang = 'L2';
        ipMute = false;
        localAudio.getAudioTracks()[0].enabled = true;
        muteBtn.classList.remove('is-danger');
        setLang1Btn.classList.add('is-primary');
        setLang2Btn.classList.remove('is-primary');
        // msg.innerText = updateDisplayText(msgs, 'lang toggled by @host', 20);
    };

    const getTurn = () => {
        console.log(myTurn)
        if (myTurn) {
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
    };

    const muting = (lock) => {
        ipMute = true;
        localAudio.getAudioTracks()[0].enabled = false;
        muteBtn.classList.add('is-danger');
        muteBtn.disabled = lock;
        muteLock = lock;
    };
    
    const unmuting = () => {
        ipMute = false;
        localAudio.getAudioTracks()[0].enabled = true;
        muteBtn.classList.remove('is-danger');
        muteBtn.disabled = false;
        muteLock = false;
    };

};

(async function(){
    console.log('start');
    const devs = await confirmInputDevices();
    if (devs.foundAudio) {
        document.getElementById('login-btn').disabled = false;
        startConf();
    } else {
        document.getElementById('login-msg').innerText = 'Interpreter needs at least 1 auidio input(microphone)...'
    }
    
})();


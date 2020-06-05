// 会場用の変数を用意しておく
let main;
let ip;
let aud1;
let aud2;
let mainStream;
let subStream;

async function startConf() {
    const self = 'host'
    // 言語と会場の初期設定
    let currentOriLang = 'L1';
    let currentVenue = 'venue0';
    let currentIp = 'ip1'

    // マイク参照用の変数を用意しておく
    let localStream;

    // const initBtn = document.getElementById('init-btn');
    const createBtn = document.getElementById('create-btn');

    const venueList = document.querySelectorAll('.venueSel')
    
    // 言語設定用の変数
    let hostMuted = true;
    const setLang0Btn = document.getElementById('setLang0-btn');
    const setLang1Btn = document.getElementById('setLang1-btn');
    const setLang2Btn = document.getElementById('setLang2-btn');

    // 通信・管理用の変数
    const statuses = [];
    const status = document.getElementById('console');
    const msgs = [];
    const msg = document.getElementById('msg')
    const sendMsgBtn = document.getElementById('sendMsg-btn')

    document.getElementById('login-btn').addEventListener('click', () => {
        const name = document.getElementById('name').value;
        // const user = document.getElementById('user').value;
        const pw = document.getElementById('password').value;
        login({
            name: name,
            user: 'host',
            pw: pw,
        }).then(t => {
            window.Peer = new Peer(self,{
                key: t,
                debug: 1,
            });
            document.getElementById('login-msg').innerText = "Login Succeed"
            setTimeout(() => {
                createBtn.disabled = false;
            }, 1000);
        }).catch(failed => {
            document.getElementById('login-msg').innerText = failed
        });
    })

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
        setLang1Btn.innerText = `Speaker: ${mconf.lang1Name}`
        setLang2Btn.innerText = `Speaker: ${mconf.lang2Name}`

        // ビデオとオーディオを取得する
        localStream = await getMediaStream({video: true, audio: true});
        // localStream = await getMediaStream({video: false, audio: true});
        mainStream = localStream;
        // 初期状態ではホストはマイクミュート
        localStream.getAudioTracks()[0].enabled = false;

        // roomを作っていく
        // main = ホスト-会場
        main = window.Peer.joinRoom('mainsession', {
            mode: 'sfu',
            stream: null,
        });

        // mainに先に参加者がいた場合、ステータスを統一する
        main.on('open', () => {
            if (main.members.length > 0) {
                main.send({
                    type: 'initial-check',
                    who: main.members[0],
                });
            }
        })

        // main roomに参加者が入ったとき
        // ビデオに関する処理は stream のイベントで処理をする
        main.on('peerJoin', peerId => {
            // status.innerText = updateDisplayText(statuses, `Main Joined: ${peerId}`, 40);
            status.innerHTML = coloredLog(statuses, `Main Joined: ${peerId}`, 40);
            changeParam({toMain: true, toIp: false});
        });

        // main roomにストリーム付きで参加者が入ったとき
        main.on('stream', async stream => {
            const subPeerid = stream.peerId;
            if (subPeerid.startsWith('venue')) {
                document.getElementById(`set-venue${subPeerid.substr(-1)}`).disabled = false;
                document.getElementById(subPeerid).srcObject = stream;
                await document.getElementById(subPeerid).play().catch(console.error)
            }
        });

        // main roomから参加者が減った時
        main.on('peerLeave', peerId => {
            console.log(`Venue Left: ${peerId}`);
            // status.innerText = updateDisplayText(statuses, `Main Left: ${peerId}`, 40);
            status.innerHTML = coloredLog(statuses, `Main Left: ${peerId}`, 40, 'font-red');
            const subPeerid = peerId;
            if (subPeerid.startsWith('venue')) {
                document.getElementById(subPeerid).srcObject = null;
                document.getElementById(`set-venue${subPeerid.substr(-1)}`).disabled = true;
            }
        });

        main.on('data', ({src, data}) => {
            console.log(data);
            switch (data.type) {
                case 'initial-check':
                    if (data.who === self) {
                        changeParam({toMain: true, toIp: false});
                    }
                    break;

                case 'change-params':
                    // status.innerText = updateDisplayText(statuses, `${src} changed params`, 40);
                    status.innerHTML = coloredLog(statuses, `${src} changed params`, 40, 'font-blue');
                    if (data.info.venue !== currentVenue) {
                        currentVenue = data.info.venue;
                        setVenueBtnColor(currentVenue);
                    }
                    if (data.info.oriLang !== currentOriLang) {
                        currentOriLang = data.info.oriLang;
                        setLang(currentOriLang)
                    }
                    if (data.info.ip !== currentIp) {
                        currentIp = data.info.ip;
                    }
                    setStream();
                    break;

                default:
                    break;
            }
        });

        // 通訳用の会議室
        ip = window.Peer.joinRoom('ip', {
            mode: 'sfu',
            stream: mainStream,
        });

        ip.on('open', () => {
            if (ip.members > 0) {
                ip.send({
                    type: 'initial-check',
                    who: ip.members[0],
                });
            }
        })

        ip.on('peerJoin', () => {
            changeParam({toMain: false, toIp: true});
        })

        ip.on('stream', stream => {
            if (stream.peerId === currentIp) {
                subStream = stream;
                console.log(`subStream set ${stream.peerId}`)
            }
        })

        ip.on('data', ({src, data}) => {
            switch(data.type) {
                case 'initial-check':
                    if (data.who === self) {
                        changeParam({toMain: false, toIp: true});
                    }
                    break;
                // 言語の切り替え
                case 'change-params':
                    // status.innerText = updateDisplayText(statuses, `${src} changed params`, 40);
                    status.innerHTML = coloredLog(statuses, `${src} changed params`, 40);
                    if (data.info.venue !== currentVenue) {
                        currentVenue = data.info.venue;
                        setVenueBtnColor(currentVenue);
                        // ip.replaceStream(mainStream);
                    }
                    if (data.info.oriLang !== currentOriLang) {
                        currentOriLang = data.info.oriLang;
                        setLang(currentOriLang)
                    }
                    if (data.info.ip !== currentIp) {
                        currentIp = data.info.ip;
                    }
                    setStream();
                    break;

                case 'msg':
                    // msg.innerText = updateDisplayText(msgs, data.info, 40);
                    msg.innerHTML = coloredLog(msgs, data.info.text, 40, data.info.color);
                    break;

                default:
                    break;
            }
            
        })

        sendMsgBtn.addEventListener('click', () => {
            const text = document.getElementById('sendMsg').value;
            ip.send({
                type: 'msg',
                info: {
                    text,
                    color: 'font-green'
                },
            });
            // msg.innerText = updateDisplayText(msgs, text, 20);
            msg.innerHTML = coloredLog(msgs, text, 20, 'font-green');
            document.getElementById('sendMsg').value = '';
        });

        sendMsg.addEventListener('keyup', ev => {
            if (ev.keyCode === 13) {
                sendMsgBtn.click();
            }
        })

        // aud 聴衆用
        // hostからも一応は送れるようにしておく
        aud1 = window.Peer.joinRoom('audienceL1', {
            mode: 'sfu',
            stream: localStream,
        });

        // aud roomに参加者が入ったとき
        // ビデオに関する処理は stream のイベントで処理をする
        aud1.on('peerJoin', peerId => {
            console.log(`AudienceL1 Joined: ${peerId}`);
            // status.innerText = updateDisplayText(statuses, `Audience Joined: ${peerId}`, 40);
            status.innerHTML = coloredLog(statuses, `Audience Joined: ${peerId}`, 40, 'font-blue');
        });

        aud2 = window.Peer.joinRoom('audienceL2', {
            mode: 'sfu',
            stream: localStream,
        });

        // aud roomに参加者が入ったとき
        // ビデオに関する処理は stream のイベントで処理をする
        aud2.on('peerJoin', peerId => {
            console.log(`AudienceL1 Joined: ${peerId}`);
        //     status.innerText = updateDisplayText(statuses, `Audience Joined: ${peerId}`, 40);
            status.innerHTML = coloredLog(statuses, `Audience Joined: ${peerId}`, 40, 'font-blue');
        });

        const changeParam = ({toMain, toIp}) => {
            const que = {
                type: 'change-params',
                info: {
                    oriLang: currentOriLang,
                    venue: currentVenue,
                    ip: currentIp,
                },
            };
            if (toMain) {
                main.send(que);
            }
            if (toIp) {
                ip.send(que)
            }
        }

        const setStream = () => {
            if (currentVenue === 'venue0') {
                ip.replaceStream(localStream);
                aud1.replaceStream(localStream);
                aud2.replaceStream(localStream);
            } else {
                for (const rs of Object.values(main.remoteStreams)) {
                    if (rs.peerId === currentVenue) {
                        mainStream = rs;
                    }
                }
                if (mainStream === undefined) {
                    mainStream = localStream;
                }
                if (subStream === undefined) {
                    subStream = localStream;
                }
                ip.replaceStream(mainStream);
                subStream = new MediaStream(
                    [...mainStream.getVideoTracks(), ...subStream.getAudioTracks()]
                );
                if (currentOriLang === 'L1') {
                    aud1.replaceStream(mainStream);
                    aud2.replaceStream(subStream);
                } else if (currentOriLang === 'L2') {
                    aud1.replaceStream(subStream);
                    aud2.replaceStream(mainStream);
                }
            }
        }

        // 会場切り替えの表示用の関数
        const setVenueBtnColor = (index) =>{
            let vidx = typeof(index) === 'string' ? Number(index.substr(-1)) : index;
            for (let i = 0; i<venueList.length; i++) {
                if (i === vidx) {
                    venueList[i].classList.add('is-primary');
                } else {
                    venueList[i].classList.remove('is-primary');
                }
            }
        };

        // 会場切り替え用のイベントリスナー
        for (let i = 0; i<venueList.length; i++) {
            venueList[i].addEventListener('click', () => {
                currentVenue = `venue${i}`,
                setVenueBtnColor(i);
                setStream();
                changeParam({toMain: true, toIp: true});
            });
        }

        // 言語切り替え用の関数
        const setLang = (lang) => {
            switch (lang) {
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

        const setOriL0 = () => {
            setLang0Btn.classList.add('is-primary');
            setLang1Btn.classList.remove('is-primary');
            setLang2Btn.classList.remove('is-primary');
            currentOriLang = 'L0';
            currentVenue = 'venue0';
            hostMuted = false;
            localStream.getAudioTracks()[0].enabled = true;
            // status.innerText = updateDisplayText(statuses, `host unmute`, 40);
            status.innerHTML = coloredLog(statuses, `host unmute`, 40, 'font-green');
            aud1.replaceStream(localStream);
            aud2.replaceStream(localStream);
        }

        const setOriL1 = () => {
            currentOriLang = 'L1';
            changeParam({toMain: false, toIp: true});
            setLang0Btn.classList.remove('is-primary');
            setLang1Btn.classList.add('is-primary');
            setLang2Btn.classList.remove('is-primary');
            hostMuted = true;
            localStream.getAudioTracks()[0].enabled = false;
        }

        const setOriL2 = () => {
            currentOriLang = 'L2';
            changeParam({toMain: false, toIp: true});
            setLang0Btn.classList.remove('is-primary');
            setLang1Btn.classList.remove('is-primary');
            setLang2Btn.classList.add('is-primary');
            hostMuted = true;
            localStream.getAudioTracks()[0].enabled = false;
        }

        setLang0Btn.addEventListener('click', () => {
            setOriL0();
        });

        setLang1Btn.addEventListener('click', () => {
            setOriL1();
        });

        setLang2Btn.addEventListener('click', () => {
            setOriL2();
        })
    });
    // createBtn　ここまで
};

(async function(){
    console.log('start');
    startConf();
})();

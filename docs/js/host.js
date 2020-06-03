// 会場用の変数を用意しておく
let main;
let ip;
let aud1;
let aud2;
let mainStream;
let subStream;

async function startConf() {
    // 言語と会場の初期設定
    let currentOriLang = 'L1';
    let currentVenue = 'venue0';
    let currentIp = 'ip1'

    // マイク参照用の変数を用意しておく
    let localStream;

    const initBtn = document.getElementById('initBtn');
    const createBtn = document.getElementById('createBtn');

    const venueList = document.querySelectorAll('.venueSel')
    
    // 言語設定用の変数
    let hostMuted = true;
    const setLang0Btn = document.getElementById('setLang0Btn');
    const muteLang0Btn = document.getElementById('muteLang0Btn');
    const setLang1Btn = document.getElementById('setLang1Btn');
    const setLang2Btn = document.getElementById('setLang2Btn');

    // 通信・管理用の変数
    const statuses = [];
    const status = document.getElementById('console');
    const msgs = [];
    const msg = document.getElementById('msg')
    const sendMsgBtn = document.getElementById('sendMsgBtn')

    // 最初の接続を行う
    initBtn.addEventListener('click', async() => {
        // ID：hostでPeer接続する
        window.Peer = new Peer('host',{
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

        // main roomに参加者が入ったとき
        // ビデオに関する処理は stream のイベントで処理をする
        main.on('peerJoin', peerId => {
            status.innerText = updateDisplayText(statuses, `Main Joined: ${peerId}`, 40);
            changeParam({toMain: true, toIp: false});
        });

        // main roomにストリーム付きで参加者が入ったとき
        main.on('stream', async stream => {
            const subPeerid = stream.peerId;
            if (subPeerid.startsWith('venue')) {
                document.getElementById(`setVenue${subPeerid.substr(-1)}`).disabled = false;
                document.getElementById(subPeerid).srcObject = stream;
                await document.getElementById(subPeerid).play().catch(console.error)
            }
        });

        // main roomから参加者が減った時
        main.on('peerLeave', peerId => {
            console.log(`Venue Left: ${peerId}`);
            status.innerText = updateDisplayText(statuses, `Main Left: ${peerId}`, 40);
            const subPeerid = peerId;
            if (subPeerid.startsWith('venue')) {
                document.getElementById(subPeerid).srcObject = null;
                document.getElementById(`setVenue${subPeerid.substr(-1)}`).disabled = true;
            }
        });

        main.on('data', ({src, data}) => {
            console.log(data);
            switch (data.type) {
                case 'change-params':
                    status.innerText = updateDisplayText(statuses, `${src} changed params`, 40);
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

        ip.on('peerJoin', () => {
            changeParam({toMain: false, toIp: true});
        })

        ip.on('stream', stream => {
            if (stream.peerId === currentIp) {
                subStream = stream;
            }
        })

        ip.on('data', ({src, data}) => {
            switch(data.type) {
                // 言語の切り替え
                case 'change-params':
                    status.innerText = updateDisplayText(statuses, `${src} changed params`, 40);
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
                    msg.innerText = updateDisplayText(msgs, data.info, 40);
                    break;

                default:
                    break;
            }
            
        })

        sendMsg.addEventListener('keyup', ev => {
            if (ev.keyCode === 13) {
                const text = document.getElementById('sendMsg').value;
                main.send({
                    type: 'msg',
                    info: text,
                });
                msg.innerText = updateDisplayText(msgs, text, 20);
                document.getElementById('sendMsg').value = '';
            }
        })

        sendMsgBtn.addEventListener('click', () => {
            const text = document.getElementById('sendMsg').value;
            ip.send({
                type: 'msg',
                info: text,
            });
            msg.innerText = updateDisplayText(msgs, text, 20);
            document.getElementById('sendMsg').value = '';
        });

        // aud 聴衆用
        // hostからも一応は送れるようにしておく
        aud1 = window.Peer.joinRoom('audienceL1', {
            mode: 'sfu',
            stream: localStream,
        });

        aud1.on('open', () => {
            if (hostMuted) {
                aud1.replaceStream(null);
            }
        });

        // aud roomに参加者が入ったとき
        // ビデオに関する処理は stream のイベントで処理をする
        aud1.on('peerJoin', peerId => {
            console.log(`AudienceL1 Joined: ${peerId}`);
            status.innerText = updateDisplayText(statuses, `Audience Joined: ${peerId}`, 40);
        });

        aud2 = window.Peer.joinRoom('audienceL1', {
            mode: 'sfu',
            stream: localStream,
        });

        aud2.on('open', () => {
            if (hostMuted) {
                aud2.replaceStream(null);
            }
        });

        // aud roomに参加者が入ったとき
        // ビデオに関する処理は stream のイベントで処理をする
        aud2.on('peerJoin', peerId => {
            console.log(`AudienceL1 Joined: ${peerId}`);
            status.innerText = updateDisplayText(statuses, `Audience Joined: ${peerId}`, 40);
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
            let subStream_ = subStream;
            if (currentVenue === 'venue0') {
                mainStream = localStream;
                subStream = localStream;
                ip.replaceStream(localStream);
                aud1.replaceStream(localStream);
                aud2.replaceStream(localStream);
            } else {
                for (const rs of Object.values(main.remoteStreams)) {
                    if (rs.peerId === currentVenue) {
                        mainStream = rs;
                    }
                }
                ip.replaceStream(mainStream);
                subStream = new MediaStream(
                    [...mainStream.getVideoTracks(), ...subStream_.getAudioTracks()]
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
            status.innerText = updateDisplayText(statuses, `host unmute`, 40);
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

        muteLang0Btn.addEventListener('click', () => {
            if (hostMuted) {
                localStream.getAudioTracks()[0].enabled = true;
                muteLang0Btn.classList.remove('is-danger');
                hostMuted = false;
                main.send({
                    type: 'host-unmute',
                });
            } else {
                localStream.getAudioTracks()[0].enabled = false;
                muteLang0Btn.classList.add('is-danger');
                hostMuted = true;
                main.send({
                    type: 'host-mute',
                });
            }
        })

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

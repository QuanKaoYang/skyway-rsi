// 会場用の変数を用意しておく
let main;
let aud;

async function startConf() {
    // 言語と会場の初期設定
    let currentOriLang = 'L1';
    let currentVenue = 'venue0';

    // マイク参照用の変数を用意しておく
    let localAudio;

    const initBtn = document.getElementById('initBtn');
    const createBtn = document.getElementById('createBtn');

    // 会場設定用の変数
    const setNoVenue = document.getElementById('setNoVenue');
    const setVenue1 = document.getElementById('setVenue1');
    const setVenue2 = document.getElementById('setVenue2');
    const setVenue3 = document.getElementById('setVenue3');
    const setVenue4 = document.getElementById('setVenue4');
    const setVenue5 = document.getElementById('setVenue5');
    const setVenue6 = document.getElementById('setVenue6');
    const setVenue7 = document.getElementById('setVenue7');
    const setVenue8 = document.getElementById('setVenue8');
    // const venueList = [
    //     setNoVenue,
    //     setVenue1, setVenue2, setVenue3, setVenue4,
    //     setVenue5, setVenue6, setVenue7, setVenue8,
    // ];
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
        localAudio = await getMediaStream({video: false, audio: true});
        // 初期状態ではホストはマイクミュート
        localAudio.getAudioTracks()[0].enabled = false;

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
            status.innerText = updateDisplayText(statuses, `Venue Joined: ${peerId}`, 40);
            main.send({
                type: 'toggle-ori-lang',
                info: {
                    oriLang: currentOriLang,
                    venue: currentVenue,
                }
            });
        });

        // main roomにストリーム付きで参加者が入ったとき
        main.on('stream', async stream => {
            const subPeerid = stream.peerId;
            if (subPeerid.startsWith('venue')) {
                document.getElementById(subPeerid).srcObject = stream;
                await document.getElementById(subPeerid).play().catch(console.error)
            }
        });

        // main roomに参加者が入ったとき
        main.on('peerLeave', peerId => {
            console.log(`Venue Left: ${peerId}`);
            status.innerText = updateDisplayText(statuses, `Venue Left: ${peerId}`, 40);
            const subPeerid = peerId;
            if (subPeerid.startsWith('venue')) {
                document.getElementById(subPeerid).srcObject = null;
            }
        });

        main.on('data', ({src, data}) => {
            switch (data.type) {
                case 'host-mute':
                    aud.replaceStream(null);
                    break;

                case 'host-unmute':
                    aud.replaceStream(localAudio);
                    break;

                case 'ip-mute':
                    status.innerText = updateDisplayText(statuses, `${src}: mute`, 40);
                    break;

                case 'ip-unmute':
                    status.innerText = updateDisplayText(statuses, `${src}: unmute`, 40);
                    break;

                case 'msg':
                    msg.innerText = updateDisplayText(msgs, data.info, 40);
                    break;

                // 言語の切り替え
                case 'toggle-ori-lang':
                    status.innerText = updateDisplayText(statuses, `${src} toggle Lang`, 40);
                    currentVenue = data.info.venue;
                    switch (data.info.oriLang) {
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
                    break;

                // 会場の切り替え
                case 'change-main':
                    currentVenue = data.info.venue;
                    const venueNum = Number(currentVenue.substr(-1));
                    setVenueBtnColor(venueNum)
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
            main.send({
                type: 'msg',
                info: text,
            });
            msg.innerText = updateDisplayText(msgs, text, 20);
            document.getElementById('sendMsg').value = '';
        });

        // aud 聴衆用
        // hostからも一応は送れるようにしておく
        aud = window.Peer.joinRoom('audience', {
            mode: 'sfu',
            stream: localAudio,
        });

        aud.on('open', () => {
            if (hostMuted) {
                aud.replaceStream(null);
            }
        });

        // aud roomに参加者が入ったとき
        // ビデオに関する処理は stream のイベントで処理をする
        aud.on('peerJoin', peerId => {
            console.log(`Audience Joined: ${peerId}`);
            status.innerText = updateDisplayText(statuses, `Audience Joined: ${peerId}`, 40);
        });

    });
    // connectBtn　ここまで

    // 会場切り替えの表示用の関数
    const setVenueBtnColor = (index) =>{
        for (let i = 0; i<venueList.length; i++) {
            if (i === index) {
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
            main.send({
                type: 'change-main',
                info: {
                    oriLang: currentOriLang,
                    venue: currentVenue,
                },
            });
        })        
    }

    // setNoVenue.addEventListener('click', () => {
    //     currentVenue = 'venue0';
    //     setVenueBtnColor(0);
    //     main.send({
    //         type: 'change-main',
    //         info: {
    //             oriLang: currentOriLang,
    //             venue: currentVenue,
    //         },
    //     });
    // });

    // setVenue1.addEventListener('click', () => {
    //     currentVenue = 'venue1',
    //     setVenueBtnColor(1);
    //     main.send({
    //         type: 'change-main',
    //         info: {
    //             oriLang: currentOriLang,
    //             venue: currentVenue,
    //         },
    //     });
    // });

    // setVenue2.addEventListener('click', () => {
    //     currentVenue = 'venue2',
    //     setVenueBtnColor(2);
    //     main.send({
    //         type: 'change-main',
    //         info: {
    //             oriLang: currentOriLang,
    //             venue: currentVenue,
    //         },
    //     })
    // });

    // setVenue3.addEventListener('click', () => {
    //     currentVenue = 'venue3',
    //     setVenueBtnColor(3);
    //     main.send({
    //         type: 'change-main',
    //         info: {
    //             oriLang: currentOriLang,
    //             venue: currentVenue,
    //         },
    //     });
    // });

    // setVenue4.addEventListener('click', () => {
    //     currentVenue = 'venue4',
    //     setVenueBtnColor(4);
    //     main.send({
    //         type: 'change-main',
    //         info: {
    //             oriLang: currentOriLang,
    //             venue: currentVenue,
    //         },
    //     });
    // });


    // 言語切り替え用の関数
    const setOriL0 = () => {
        setLang0Btn.classList.add('is-primary');
        setLang1Btn.classList.remove('is-primary');
        setLang2Btn.classList.remove('is-primary');
        currentOriLang = 'L0';
        hostMuted = false;
        localAudio.getAudioTracks()[0].enabled = true;
        status.innerText = updateDisplayText(statuses, `host unmute`, 40);
        aud.replaceStream(localAudio);
    }

    const setOriL1 = () => {
        setLang0Btn.classList.remove('is-primary');
        setLang1Btn.classList.add('is-primary');
        setLang2Btn.classList.remove('is-primary');
        currentOriLang = 'L1';
        hostMuted = true;
        localAudio.getAudioTracks()[0].enabled = false;
        aud.replaceStream(null);
    }

    const setOriL2 = () => {
        setLang0Btn.classList.remove('is-primary');
        setLang1Btn.classList.remove('is-primary');
        setLang2Btn.classList.add('is-primary');
        currentOriLang = 'L2';
        hostMuted = true;
        localAudio.getAudioTracks()[0].enabled = false;
        aud.replaceStream(null);
    }

    setLang0Btn.addEventListener('click', () => {
        const que = {
            type: 'toggle-ori-lang',
            info: {
                oriLang: 'L0',
                venue: 'V0',
            },
        }
        main.send(que);
        aud.send(que);
        setLang0Btn.classList.add('is-primary');
        setLang1Btn.classList.remove('is-primary')
        setLang2Btn.classList.remove('is-primary')
    });

    muteLang0Btn.addEventListener('click', () => {
        if (hostMuted) {
            localAudio.getAudioTracks()[0].enabled = true;
            muteLang0Btn.classList.remove('is-danger');
            hostMuted = false;
            main.send({
                type: 'host-unmute',
            });
        } else {
            localAudio.getAudioTracks()[0].enabled = false;
            muteLang0Btn.classList.add('is-danger');
            hostMuted = true;
            main.send({
                type: 'host-mute',
            });
        }
    })

    setLang1Btn.addEventListener('click', () => {
        const que = {
            type: 'toggle-ori-lang',
            info: {
                oriLang: 'L1',
                venue: currentVenue,
            },
        };
        main.send(que);
        aud.send(que);
        setLang0Btn.classList.remove('is-primary');
        setLang1Btn.classList.add('is-primary')
        setLang2Btn.classList.remove('is-primary')
    })
    setLang2Btn.addEventListener('click', () => {
        const que = {
            type: 'toggle-ori-lang',
            info: {
                oriLang: 'L2',
                venue: currentVenue,
            },
        };
        main.send(que);
        aud.send(que);
        setLang0Btn.classList.remove('is-primary');
        setLang1Btn.classList.remove('is-primary')
        setLang2Btn.classList.add('is-primary')
    })

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

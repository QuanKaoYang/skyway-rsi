// 会場用の変数を用意しておく
let aud;

async function startConf(){
    // 会場とデフォルトのチャネル別のPeerIDを作成するための接尾辞
    // ハッシュ# 付きのURLを使用する予定
    let myLang = location.hash === '#L2' ? 'L2' : 'L1';


    const mainVideo = document.getElementById('main-video');
    const connectBtn = document.getElementById('connect-btn');
    const setLang1Btn = document.getElementById('lang1-btn');
    const setLang2Btn = document.getElementById('lang2-btn');

    if (myLang === 'L2') {
        setLang1Btn.classList.remove('is-primary');
        setLang2Btn.classList.add('is-primary');
    }

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
            user: 'audience',
            pw: pw,
        }).then(t => {
            window.Peer = new Peer({
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
        
        // 会場&通訳-オーディエンス
        // オーディエンスからは配信する内容がないので、受信専用としてstreamはnull
        let audCreation = () => {
            console.log('created')
            aud = window.Peer.joinRoom(`audience${myLang}`, {
                mode: 'sfu',
                stream: null,
            });
    
            // 会場からの音・通訳からの音をそれぞれAudioのソースに設定
            aud.on('stream', async stream => {
                console.log(stream)
                mainVideo.srcObject = stream;
                await mainVideo.play().catch(console.error)
            });
        }
        
        audCreation();

        const changeLang = (lang) => {
            if (myLang === lang) {
                return;
            } else {
                myLang = lang;
                aud.close();
                audCreation();
                if (myLang === 'L1') {
                    setLang1Btn.classList.add('is-primary');
                    setLang2Btn.classList.remove('is-primary')
                } else if (myLang === 'L2') {
                    setLang1Btn.classList.remove('is-primary');
                    setLang2Btn.classList.add('is-primary')
                }
            }
        }
        setLang1Btn.addEventListener('click', () => {
            changeLang('L1');
        });
    
        setLang2Btn.addEventListener('click', () => {
            changeLang('L2');
        });
    });
};

(async function(){
    console.log('start');
    startConf();
})();

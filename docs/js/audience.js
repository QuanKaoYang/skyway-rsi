// 会場用の変数を用意しておく
let aud;

async function startConf(){
    // 会場とデフォルトのチャネル別のPeerIDを作成するための接尾辞
    // ハッシュ# 付きのURLを使用する予定
    let myLang = location.hash === '#L2' ? 'L2' : 'L1';
    // let currentOriLang = 'L1';

    const initBtn = document.getElementById('init-btn');
    const connectBtn = document.getElementById('connect-btn');

    const mainVideo = document.getElementById('main-video');

    const setLang1Btn = document.getElementById('lang1-btn');
    const setLang2Btn = document.getElementById('lang2-btn');

    // const reloadBtn = document.getElementById('reload-btn');
    // const fullScrBtn = document.getElementById('fullScr-btn');

    if (myLang === 'L2') {
        setLang1Btn.classList.remove('is-primary');
        setLang2Btn.classList.add('is-primary');
    }

    // 最初の接続を行う
    initBtn.addEventListener('click', async() => {
        // Peer接続のためのコンストラクタ
        window.Peer = new Peer({
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
    
        // reloadBtn.addEventListener('click', () => {
        //     console.log('reload');
        //     aud.close();
        //     aud = window.Peer.joinRoom('audience', {
        //         mode: 'sfu',
        //         stream: null,
        //     });
        // });
    
    });


    // fullScrBtn.addEventListener('click', () => {
    //     console.log('reload');
    //     mainVideo.requestFullscreen()
    //         .then(()=> {
    //             console.log('full');
    //         })
    //         .catch(() => {
    //             console.error;
    //         });
    // });

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

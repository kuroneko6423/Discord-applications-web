console.log(require('discord.js').version)

const {Client, Intents, MessageActionRow,
  MessageButton} = require('discord.js'),
  //分割代入する
  client = new Client({intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]}),
  //インテンツ指定
  mongo = require("aurora-mongo"),
  //aurora-mongoを読み込む
  db = new mongo.Database("oauth"),
  //インスタンスを作る
  axios = require('axios'),
  //axios読み込む
  express = require('express'),
  //express読み込む
  app = express(),
  //express関数をappに代入
 port = process.env.PORT || 80,
 //ポートを指定する
  oauth = {
    clientid: "BOTのID",//クライアント(BOT)のID
    clientsecret: "クライアントシークレット",//クライアントselect
    siteurl:"https://captcha.kuronekoserver.com",//自分のサイトURL
    scope:"identify"//特別いじらなくてよい
  },
  oauth_info =`https://discord.com/api/oauth2/authorize?client_id=${oauth.clientid}&redirect_uri=${oauth.siteurl}/token/&response_type=code&scope=${oauth.scope}`,
  //URLを発行
  datalist = [];
  //からの配列を作る
/*===========
サーバー立てる
============*/
app.listen(port);
//指定したportでサーバーを立てる
console.log(`site listien!!\nURL=${oauth.siteurl}/login/?uid=test&sid=test`)
//test用URLをconsoleに出す
mongo.connect("mongodb://root@127.0.0.1:27017");

/*=======
web関係
========*/
app
.get('/login/*', async (req, res) => {
  //url/login/だったら関数実行
  if(!req.query.uid) return res.send("無効なパラメーターユーザーIDが不明です(uid)<br>コマンドからやり直してください");
  //クエリがなかったらエラーを出す
  if(!req.query.sid) return res.send("無効なパラメーターサーバーIDが不明です(sid)<br>コマンドからやり直してください");
  //クエリがなかったらエラーを出す
datalist[req.query.uid] = req.query.sid;
//[uid:sid]の形で保存
 res.redirect(oauth_info);
 //リダイレクトする
})
.get('/token/*', async (req, resolve) => {
  //url/token/だったら関数実行
  if (!req.query.code) return resolve.send("エラー:パラメーターが読み込めませんでした\nもう一度行ってください");
  //クエリがなかったらエラーを出す
  let headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
  }
  //headerの値
  const post = await axios.post("https://discord.com/api/oauth2/token", `client_id=${oauth.clientid}&client_secret=${oauth.clientsecret}&grant_type=authorization_code&code=${req.query.code}&redirect_uri=${oauth.siteurl}/token/&scope=${oauth.scope}`, {
    //POSTする
      headers: headers
      //上のやつ
  })
  .catch(() => resolve.send(`エラー:アクセストークン取得失敗`));
  //エラーを出す
  if(!post.data?.access_token) return;
  //postのデータがなかったら処理しない
  const content = await axios.get('https://discordapp.com/api/v8/users/@me', {
    //GETする
      headers: {
          "Authorization": `Bearer ${post.data.access_token}`,
      }
      //headers
  })
  .catch(() => resolve.send("エラー:ユーザーにアクセスできませんでした<br>最もよくあるのはアクセストークンの有効期限切れ(リロードした際になる)<br>もう一度認証してください"));
  //エラーが起きた場合出す

  const getdata = datalist[content.data.id]
  console.log(getdata)
  //保存したデータを取得
   if(!getdata) return resolve.send(`ユーザーIDが一致しませんでした(ボタンを押したユーザーとDiscordのユーザーはあっていますか？)`);
   //getdataに値がなかったら出す
    const role_id = await db.get(getdata),
    //ロールIDをMONGOから取得
     guild = client.guilds.cache.get(getdata);
     //ギルドをIDを使ってcacheしてguildに代入
     if(!guild) return　resolve.send("無効なサーバー");
     //サーバーが見つからなかった場合
     const user = await guild.members.fetch(content.data.id);
     //取得したギルドからIDを使ってユーザーを取得
   user.roles.add(role_id)
   //取得したデータを使ってロールを付ける
   .then(resolve.send(`ロール付与に成功しました<br>serverID:${getdata}<br>userid:${content.data.id}<br>roleid:${role_id}`))
   //成功したばあい
   .catch(e=>resolve.send(`エラー${e}<br>もっともよくあるのはロールが存在しないもしくは権限がBOTより低いことです<br>サーバー管理者にお問い合わせください`));
   //失敗した場合
   delete datalist[content.data.id]
});

//DiscordBOT関連
client
.on('messageCreate', async message => {
  //messageイベント
  if (message.content.startsWith("!追加")) {
    //メッセージの初めの文字が!追加の場合
    const role = message.content.split(" ")[1]?.replace(/[^0-9]/g, '');
    //message.contentの1番目の配列(この場合splitで空白毎に配列にしているので1番目の配列)の値から数値以外をとった値をroleに代入
    if(!role) return message.reply("ないよ");
    //roleに何も代入されていなかったら表示する
    const button = new MessageButton()
      .setCustomId("URLcreate")
      .setStyle("PRIMARY")
      .setLabel("認証")
      .setEmoji("🐈");
      //button宣言
     message.member.roles.add(role)
     //メッセージを打った人に初めのそのロールを付ける
     .then(async()=>{
       //成功した場合
       await db.set(message.guild.id,role);
       //DBにギルドIDをプロパティにしてロールIDを保存する
       message.reply({
             content: "認証リンクを表示",
             //コンテンツ(メッセージ)
             components: [new MessageActionRow().addComponents(button)]
             //ボタン設置
         });
         //メッセージ送信
     })
     .catch(e=>message.reply(`エラー${e}`));
     //ロールを付けるのに失敗した場合
  }
})
.on("interactionCreate",async interaction =>{
  //interactionイベント発火
 if (interaction.customId === "URLcreate") {
   //CustomIDがURLcreateの場合処理
       const  button1 = new MessageButton()
      .setURL(`${oauth.siteurl}/login/?uid=${interaction.user.id}&sid=${interaction.guild.id}`)
      .setStyle("LINK")
      .setLabel("認証LINK")
      .setEmoji("🐈");
      //ボタン宣言
      interaction.reply({
             content: "認証リンクを使う",
             //コンテンツ(メッセージ)
             components: [new MessageActionRow().addComponents(button1)],
             //ボタン設置
             ephemeral: true
             //その人にしか見えないようにする
         });
 }
})

client.on('ready', () => {
    //This will get the amount of servers and then return it.
    const servers = client.guilds.cache.size
    // const users = client.users.cache.size
    
    console.log(`Botは今 ${servers} 個のサーバーに入ってるよー`)

    client.user.setActivity(`!追加 ロールID | 導入数 ${servers} `, {
        type: 'PLAYING',
    })
})
  

.login("TOKEN")
//BOTをログインさせる
.then(console.log("LOGIN"))
//成功した場合
.catch(e => console.log(`TOKEN error${e.message}`));
//失敗した場合

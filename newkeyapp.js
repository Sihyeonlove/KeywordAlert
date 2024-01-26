const token = 'MTIwMDM0MDIwNDU4MjYxMzAzMg.GgXYYC.u--G4N4-rALxYKXliwhsxMeNf-z-n-g6C2o46A'; //토큰
const clientId = '1200340204582613032'; //ID

let userdb = []; //-틀-
/**단어를 감지해서, 들어있으면 true, 아니면 false 리턴하는 boolen 리턴 함수, 파라미터는 각각 키워드 array와 메시지 string */
function detectword(keyword, content) { // 
    for (let i = 0; i < keyword.length; i++) {
        const regex = new RegExp(keyword[i]); //정규식 자동 생성
        if (regex.test(content)) { // 정규식을 만족하는가?
            return true;
        }
    }
    return false;
};

const { Client, Intents, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, WebSocketShardDestroyRecovery, Integration, cleanCodeBlockContent } = require('discord.js');
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, // 2^0
        GatewayIntentBits.GuildMessages, // 2^9
        GatewayIntentBits.GuildMessageReactions, // 2^10
        GatewayIntentBits.MessageContent, // 2^15
        GatewayIntentBits.GuildVoiceStates, // 2^7 // To Binary ~~ 2진법 이용한 인텐스 구분, Bits 단위, Gateway 바이너리 요청 ~~ discord dev portal => get require
    ],
});

const { REST } = require('discord.js'); //REST
const { Routes } = require('discord.js'); //Routes
const { SlashCommandBuilder } = require('discord.js'); //명령어 등록용, v13 아니다!!
const { EmbedBuilder } = require('discord.js'); //Embed 등록용
const fs = require('fs'); //fs

const rest = new REST({ version: '10' }).setToken(token); // discord.js v14가 되면서, rest가 v10을 지원함.
/**json 형태로 내보내는 함수, 같은 코드를 명령어마다 찍기 귀찮아서 함수로 적어놓음. */
function jsonpost() {
    try {
        const datafilePath = 'userdbbr.json'; // 데이터파일 경로
        const postdata = JSON.stringify(userdb); // 내보낼 데이터를 string화해서 저장
        fs.writeFileSync(datafilePath, postdata); // 그 데이터를 json으로 데이터파일 경로에 저장
    } catch (error) {
        console.log('데이터 이전 실패, 에러 : ' + error);
    }
};

const commands = [
    new SlashCommandBuilder()
    .setName('키알관리')
    .setDescription('키워드를 등록하거나 삭제할 수 있습니다!')
    .addStringOption(option =>
        option.setName('키워드')
        .setDescription('어떠한 단어를 감지할지 결정합니다!')
        .setRequired(true)),
    new SlashCommandBuilder()
    .setName('키알확인')
    .setDescription('지금까지 등록한 키워드를 확인할 수 있습니다!'),
    new SlashCommandBuilder()
    .setName('핑')
    .setDescription('퐁!'),
].map(command => command.toJSON());

client.on('ready', async() => {

    try {
        const jsonf = fs.readFileSync('userdbbr.json', 'utf-8'); // userdb.json을 가져오고
        userdb = JSON.parse(jsonf); // 가져온 데이터는 현재의 userdb에 덮어쓴다.
        console.log('유져 데이터 불러오기 성공.\n');
    } catch (error) {
        console.log('유져 데이터 불러오기 실패.에러 : ' + error + '\n');
    }

    client.user.setPresence({ // 
        status: 'online', // 온라인 상태
        activities: [{
            name: '정보 수집', // 상태 메시지
            type: 0, // 0 = 플레이 중
            //details: '모으는 중...', // 상세 정보
            state: '정보 수집 하는 중...', // 상태
            url: 'https://shiftup.co.kr/', // 링크
            //assets: {}, // 에셋, 안씀
            timestamps: {
                start: 0,
                end: 6000000000,
            }, // 시작 및 종료 시간, 안씀
            party: {
                id: 'ae488379-351d-4a4f-ad32-2b9b01c91657', //안쓸듯
                size: [1, 10]
            }, // 파티 정보 설정
            secrets: {}, // 비밀 정보 설정
        }, ],
    });
    console.log(`${client.user.tag}!출격합니다!\n`);
    (async() => {
        try {
            console.log('빗금 명령어 등록 중...');
            await rest.put( // rest 를 이용해
                Routes.applicationCommands(clientId), // 클라이언트 아이디로 글로벌 커맨드 등록
                { body: commands }
            );
            console.log('등록 완료!');
        } catch (error) {
            console.error('등록 실패, 에러 사항 : ', error);
        }
    })();
});

client.on('messageCreate', async(message) => {
    const content = message.content;
    const author = message.author;
    const url = message.url;
    userdb.forEach(async(userdb) => {
        const keybool = detectword(userdb.keyword, content);
        if (keybool && !(author.bot)) {
            try {
                const user = await client.users.fetch(userdb.id);
                const dmChannel = await user.createDM();

                const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('키워드 알림이 도착했어요!')
                    .setURL(url)
                    .setAuthor({ name: '브라우니의 의뢰 알림' })
                    .setDescription(`${author.displayName} 님이 보낸 메시지를 감지했어요!`)
                    .addFields({ name: '메시지 내용', value: content })
                    .setTimestamp()

                await dmChannel.send({ embeds: [embed] });
            } catch (error) {
                console.log(error);
            }
        }
    })
});

client.on('interactionCreate', async(interaction) => {
    const { commandName, options } = interaction;
    if (interaction.isCommand() == false) {
        return;
    }
    if (commandName === '키알관리') {
        const user = interaction.user;
        const keyword = options.getString('키워드');
        const fi = userdb.findIndex(db => db.id == user.id);
        if (fi == -1) {
            userdb.push({
                id: user.id,
                name: user.displayName,
                keyword: [keyword],
            });
            const message = await interaction.reply({ content: `이제부터 ${keyword}에 대한 정보를 수집할게요!`, ephemeral: false });
        } else {
            const fi2 = userdb[fi].keyword.findIndex(str => str == keyword);
            if (fi2 == -1) {
                if (userdb[fi].keyword.length <= 4) {
                    userdb[fi].keyword.push(keyword);
                    const message = await interaction.reply({ content: `이제부터 ${keyword}에 대한 정보를 수집할게요!`, ephemeral: false });
                } else {
                    const message = await interaction.reply({ content: `5개보다 더 많이 수집하고 싶다면 정보료를 내세요!`, ephemeral: false });
                }
            } else {
                userdb[fi].keyword.splice(fi2, 1);
                const message = await interaction.reply({ content: `이제부터 "${keyword}"에 대한 정보를 수집하지 않을게요!`, ephemeral: false });
            }
        }
        jsonpost();
    } else if (commandName === '키알확인') {
        const user = interaction.user;
        const fi = userdb.findIndex(db => db.id == user.id);
        if (fi != -1) {
            let str = '';
            for (let i = 0; i < userdb[fi].keyword.length; i++) {
                str += userdb[fi].keyword[i];
                if (i < userdb[fi].keyword.length - 1) {
                    str += ',';
                }
            }
            if (userdb[fi].keyword.length == 0) {
                const message = await interaction.reply({ content: `고객님은 아직 저에게 의뢰를 하시지 않으셨어요...`, ephemeral: false });
            } else {
                const message = await interaction.reply({ content: `${user.displayName}님은 현재 "${str}"의 정보에 대해 의뢰를 하셨어요!`, ephemeral: false });
            }
        } else {
            const message = await interaction.reply({ content: `고객님은 아직 저에게 의뢰를 하시지 않으셨어요...`, ephemeral: false });
        }
    } else if (commandName === '핑') {
        const message = await interaction.reply({ content: `퐁!\n${client.ws.ping}ms로 정보를 수집하고 있어요!\n\n브라우니는 햄스터가 아니에요!`, ephemeral: false });
    }
});

client.login(token);
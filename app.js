const fs = require('fs');
const path = require('path')
const axios = require('axios');
const player = require('play-sound')(opts = { player: 'mpg123' });

const schedule = require('node-schedule');
const bleno = require('bleno'); // for implementing BLE peripheral

const SONG_PLAYTIME = 30000;
const playlistDir = './songs'

const BASE_UUID = '-5659-402b-aeb3-d2f7dcd1b999';
const PERIPHERAL_ID = '0000';
const PRIMARY_SERVICE_ID = '0100';

const primary_service_uuid = PERIPHERAL_ID + PRIMARY_SERVICE_ID + BASE_UUID;
const ps_characteristic_uuid = PERIPHERAL_ID + '0300' + BASE_UUID;

const settings = {
    service_id: primary_service_uuid,
    characteristic_id: ps_characteristic_uuid
};

const CHARACTERISTIC_RESULTS = {
    SUCCESS: bleno.Characteristic.RESULT_SUCCESS,
    BAD_REQUEST: bleno.Characteristic.RESULT_INVALID_ATTRIBUTE_LENGTH,
    ERROR: bleno.Characteristic.RESULT_UNLIKELY_ERROR
}

var runJob = false;

createSongsDir();

var alarmJob = createAlarmJob();

addBlenoListeners();

var audio;
function createAlarmJob() {
    return schedule.scheduleJob('* * * * * *', () => {
        if (runJob) {
            console.log('Alarm started');
            runJob = false;
            const songs = fs.readdirSync(playlistDir);
            const firstSong = songs.splice(0, 1)[0];
            audio = player.play(`${playlistDir}/${firstSong}`);
            const interval = setInterval(() => {
                if (songs.length) {
                    const nextSong = songs.splice(0, 1)[0];
                    audio.kill();
                    audio = player.play(`${playlistDir}/${nextSong}`);
                }
                else {
                    audio.kill();
                    clearInterval(interval);
                }
            }, SONG_PLAYTIME);
        }
    });
}

function createSongsDir() {
    if (!fs.existsSync(playlistDir)) {
        fs.mkdirSync(playlistDir);
    }
}

function addBlenoListeners() {
    bleno.on('stateChange', function (state) {
        if (state === 'poweredOn') {
            bleno.startAdvertising('SpotiPiApp', [settings.service_id]);
        } else {
            bleno.stopAdvertising();
        }
    });

    bleno.on('advertisingStart', function (error) {
        if (error) {
            console.log('something went wrong while trying to start advertisement of services');
        } else {
            console.log('started..', bleno.address, bleno.platform);
            bleno.setServices([
                new bleno.PrimaryService({ // create a service
                    uuid: settings.service_id,
                    characteristics: [
                        buildAlarmCharacteristic(),
                    ]
                })
            ]);
        }
    });
    bleno.on('accept', function (clientAddress) {
        console.log('Connected to client address: ', clientAddress);
    });
    bleno.on('advertisingStop', () => {
        console.log('Stopping...', bleno.address, bleno.platform);
    });
    bleno.on('disconnect', (clientAddress) => {
        console.log('Disconnected from client address: ', clientAddress);
    });
}

function buildAlarmCharacteristic() {
    return new bleno.Characteristic({
        value: null,
        uuid: settings.characteristic_id,
        properties: ['write'],
        onWriteRequest: handleAlarmWriteRequest
    });
}





function handleAlarmWriteRequest(data, offset, withoutResponse, callback) {
    try {
        const companionData = JSON.parse(data.toString());
        console.log('TCL: companionData', companionData);
        clearExistingSongs();
        handleData(companionData, callback);
    } catch (e) {
        callback(CHARACTERISTIC_RESULTS.ERROR);
    }

}

function handleData(companionData, callback) {
    const tracks = companionData.tracks;
    Promise.all(tracks.map(async (track) => {
        await downloadSong(track);
    })).then(() => {
        console.log('Songs downloaded');
        const alarm = companionData.alarmTime;
        setAlarm(alarm);
        console.log('Alarm set');
        callback(CHARACTERISTIC_RESULTS.SUCCESS);
    }).catch(e => {
        console.log('TCL: Error', e);
        callback(CHARACTERISTIC_RESULTS.ERROR)
    });
}

function setAlarm(alarm) {
    alarmJob.reschedule(`${alarm.minute} ${alarm.hour} * * *`);
    runJob = true;
}

async function downloadSong(track) {
    const response = await axios({
        method: 'get',
        url: track.url,
        responseType: 'stream'
    });
    response.data.pipe(fs.createWriteStream(`${playlistDir}/${track.name}.mp3`));
}

function clearExistingSongs() {
    const existing = fs.readdirSync(playlistDir);
    for (const file of existing) {
        fs.unlinkSync(path.join(playlistDir, file));
    }
}


const testData = {
    alarmTime:
    {
        hour: '*',
        minute: '*',
    },
    tracks: [{
        name: "ME! (feat. Brendon Urie of Panic! At The Disco)", url: "https://p.scdn.co/mp3-preview/37a130eba474826a6991d99b38c6278b15d11de1?cid=e2e89f3caaf14eb6ad4a91beefb9b41d"
    },
    { name: "Walk Me Home", url: "https://p.scdn.co/mp3-preview/44e8764f6028b38a76a48e98d6d2f6019e60d14e?cid=e2e89f3caaf14eb6ad4a91beefb9b41d" },
    { name: "Outta My Head (with John Mayer)", url: "https://p.scdn.co/mp3-preview/cdbf0754610cc241f80165a26fb498f8e733d6bb?cid=e2e89f3caaf14eb6ad4a91beefb9b41d" }]

}
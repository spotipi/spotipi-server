const fs = require('fs');
const axios = require('axios');
const player = require('play-sound')(opts = {});

const schedule = require('node-schedule');
const bleno = require('bleno'); // for implementing BLE peripheral


var initialJob = false;
var alarmJob = schedule.scheduleJob('* * * * * *', () => {
    if (!initialJob) {
        player.play('alarm.mp3')
    }
});

// const BASE_UUID = '-5659-402b-aeb3-d2f7dcd1b999';
// const PERIPHERAL_ID = '0000';
// const PRIMARY_SERVICE_ID = '0100';

// const primary_service_uuid = PERIPHERAL_ID + PRIMARY_SERVICE_ID + BASE_UUID;
// const ps_characteristic_uuid = PERIPHERAL_ID + '0300' + BASE_UUID;

// const settings = {
//     service_id: primary_service_uuid,
//     characteristic_id: ps_characteristic_uuid
// };

// bleno.on('stateChange', function (state) {
//     if (state === 'poweredOn') {
//         bleno.startAdvertising('SpotiPiApp', [settings.service_id]);
//     } else {
//         bleno.stopAdvertising();
//     }
// });

// bleno.on('advertisingStart', function (error) {
//     if (error) {
//         console.log('something went wrong while trying to start advertisement of services');
//     } else {
//         console.log('started..', bleno.address, bleno.platform);
//         bleno.setServices([
//             new bleno.PrimaryService({ // create a service
//                 uuid: settings.service_id,
//                 characteristics: [
//                     new bleno.Characteristic({ // add a characteristic to the service
//                         value: null,
//                         uuid: settings.characteristic_id,
//                         properties: ['write'],
//                         onWriteRequest: function (data, offset, withoutResponse, callback) {
//                             console.log('Writing');
//                             const decoded = Buffer.from(data, 'base64').toString();
//                             const companionData = JSON.parse(decoded);
//                             console.log('TCL: companionData', companionData);
//                             const tracks = companionData.tracks;
//                             Promise.all(tracks.map(async track => {
//                                 const response = await axios({
//                                     method: 'get',
//                                     url: track.url,
//                                     responseType: 'stream'
//                                 });
//                                 response.data.pipe(fs.createWriteStream(`${track.name}.mp3`))
//                             })).then(() => {
//                                 const alarm = companionData.alarmTime;
//                                 alarmJob.reschedule(`* ${alarm.minute} ${alarm.hour} * * *`)
//                                 initialJob = false;
//                             })
//                         }
//                     })
//                 ]
//             })
//         ]);
//     }
// });

// bleno.on('accept', function (clientAddress) {
//     console.log('Connected to client address: ', clientAddress);
// });

// bleno.on('disconnect', (clientAddress) => {
//     console.log('Disconnected from client address: ', clientAddress);

// })


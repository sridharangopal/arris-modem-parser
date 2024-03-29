/*jshint sub:true,asi:true,maxerr:1000*/

import dotenv from 'dotenv'
dotenv.config({
    silent: true
})
import cheerio from 'cheerio'
import request from 'request'
import {
    writeFile
} from 'fs'
import {
    hostname as _hostname
} from 'os'

import {
    InfluxDB,
    Point
} from '@influxdata/influxdb-client'

const {
    load
} = cheerio
const {
    get,
    post
} = request

const modem_ip = process.env.MODEM_IP
const url = process.env.INFLUX_URL
const token = process.env.INFLUX_TOKEN
const org = process.env.INFLUX_ORG
const bucketId = process.env.INFLUX_BUCKET_ID
const writeFileToDisk = process.env.WRITE_FILE
const writePointsToInflux = process.env.WRITE_TO_INFLUX
const writeApi = new InfluxDB({
    url,
    token
}).getWriteApi(org, bucketId, 'ns')
writeApi.useDefaultTags({
    hostname: _hostname()
})

const loginUrl = "http://" + modem_ip + "/cgi-bin/basic_pwd_cgi"
const auth = new Buffer.from(process.env.MODEM_USERNAME + ":" + process.env.MODEM_PASSWORD).toString("base64");
const dataUrl = "http://" + modem_ip + "/cgi-bin/status_cgi"
var msg = {}
const tableSelector = 'table'
const options = {
    rowForHeadings: 0, // extract th cells from this row for column headings (zero-based)
    ignoreHeadingRow: true, // Don't treat the heading row as data
    ignoreRows: [],
    downstreamChannels: process.env.DOWNSTREAM_CHANNELS,
    upstreamChannels: process.env.UPSTREAM_CHANNELS
}
var jsonReponse = []
var columnHeadings = []
var cred_cookie = ""
var $ = ""

//Function to get data from the Arris webpage and send to influx cloud
export function sendArrisDataToInflux() {
    post(loginUrl, {
        form: {
            arguments: auth,
            ar_nonce: ("" + Math.random()).substr(2, 8)
        }
    }, (err, res, body) => {
        if (err) {
            return console.log(err);
        }
        cred_cookie = res.headers['set-cookie'];
        // console.log(cred_cookie)

        // get data page
        get(dataUrl, {
            'headers': {
                'Cookie': cred_cookie[0].slice(0, -1)
            }
        }, (err, res, body) => {
            var points = [];

            if (err) {
                return console.log(err);
            }

            // console.log("Response body from get request : " + body)

            $ = load(body)

            $(tableSelector).each((i, table) => {
                var trs = $(table).find('tr')

                // Set up the column heading names
                getColHeadings($(trs[options.rowForHeadings]))

                // Process rows for data
                $(table).find('tr').each(processRow)
            });


            // Writing downstream data only to Influxdb Cloud
            jsonReponse.slice(0, options.downstreamChannels).map(item => {
                var point = new Point('downstream')
                    .tag('deviceId', 'ARRIS SBV3202')
                    .tag('DCID', item.DCID)
                    .floatField('Freq', item.Freq.split(' ')[0])
                    .floatField('Power', item.Power.split(' ')[0])
                    .floatField('SNR', item.SNR.split(' ')[0])
                    .floatField('Modulation', item.Modulation.split('Q')[0])
                    .floatField('Octets', item.Octets)
                    .floatField('Correcteds', item.Correcteds)
                    .floatField('Uncorrectables', item.Uncorrectables)

                // console.log('   ' + point.toString())

                points.push(point);
            })

            if (writePointsToInflux == 'true') {
                try {
                    writeApi.writePoints(points)
                    writeApi.flush()
                } catch (err) {
                    console.log(err)
                }
            }

            if (writeFileToDisk === 'true') {
                // Writing downstream and upstream data to filesystem
                msg.payload = {
                    data: [
                        jsonReponse.slice(0, options.downstreamChannels).map(item => {
                            var container = {
                                measurement: 'downstream',
                                tags: {
                                    deviceId: 'ARRIS SBV3202',
                                    DCID: item.DCID,
                                    location: _hostname()
                                },
                                fields: {}
                            };

                            container.fields['Freq'] = item.Freq.split(' ')[0];
                            container.fields['Power'] = item.Power.split(' ')[0];
                            container.fields['SNR'] = item.SNR.split(' ')[0];
                            container.fields['Modulation'] = item.Modulation.split('Q')[0];
                            container.fields['Octets'] = item.Octets;
                            container.fields['Correcteds'] = item.Correcteds;
                            container.fields['Uncorrectables'] = item.Uncorrectables;

                            return container;
                        }),
                        jsonReponse
                            .slice(options.downstreamChannels, options.downstreamChannels + options.upstreamChannels)
                            .map(item => {
                                var container = {
                                    measurement: 'upstream',
                                    tags: {
                                        deviceId: 'ARRIS SBV3202',
                                        UCID: item.DCID,
                                        location: _hostname()
                                    },
                                    fields: {}
                                };

                                container.fields['Freq'] = item.Freq.split(' ')[0];
                                container.fields['Power'] = item.Power.split(' ')[0];
                                container.fields['ChannelType'] = item.ChannelType;
                                container.fields['SymbolRate'] = item.Modulation.split(' ')[0];
                                container.fields['Modulation'] = item.Octets.split('Q')[0];

                                return container;
                            })
                    ]
                };


                writeFile('output.json', JSON.stringify(msg.payload, null, 4), (err) => {
                    if (err)
                        console.log(err);
                    else {
                        console.log("File written successfully to filesystem\n");
                    }
                });
            }

            return msg
        });
    });


    function getColHeadings(headingRow) {
        var alreadySeen = {}

        $(headingRow).find('td').each((j, cell) => {
            let tr = $(cell).text().trim()

            if (alreadySeen[tr]) {
                let suffix = ++alreadySeen[tr]
                tr = `${tr}_${suffix}`
            } else {
                alreadySeen[tr] = 1
            }

            columnHeadings.push(tr)
        })
    }
}

function processRow(i, row) {
    var rowJson = {}

    if (options.ignoreHeadingRow && i === options.rowForHeadings) return
    // TODO: Process options.ignoreRows

    $(row).find('td').each((j, cell) => {
        let q = j + 1;
        rowJson[columnHeadings[q]] = $(cell).text().trim()

    })

    // Skip blank rows
    if (JSON.stringify(rowJson) !== '{}') jsonReponse.push(rowJson)
}
//EOF
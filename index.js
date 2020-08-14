/*jshint sub:true,asi:true,maxerr:1000*/

const cheerio = require('cheerio')
const request = require('request')
const fs = require('fs')

const url = "https://192.168.100.1/cgi-bin/status_cgi"
var msg = {}
const tableSelector = 'table'
const options = {
    rowForHeadings: 0,  // extract th cells from this row for column headings (zero-based)
    ignoreHeadingRow: true, // Don't treat the heading row as data
    ignoreRows: [],
    downstreamChannels: 8,
    upstreamChannels: 4
}
const jsonReponse = []
const columnHeadings = []
var $ = ""

request.get(url, { json: true, strictSSL: false }, (err, res, body) => {
    if (err) {
        return console.log(err);
    }

    $ = cheerio.load(body)

    $(tableSelector).each(function (i, table) {
        var trs = $(table).find('tr')

        // Set up the column heading names
        getColHeadings($(trs[options.rowForHeadings]))

        // Process rows for data
        $(table).find('tr').each(processRow)
    })

    msg.payload = {
        // columnHeadings: columnHeadings,
        downstream: jsonReponse.slice(0, options.downstreamChannels).map(item => {
            const container = {};

            container['DCID'] = item.DCID;
            container['Freq'] = item.Freq;
            container['Power'] = item.Power;
            container['SNR'] = item.SNR;
            container['Modulation'] = item.Modulation;
            container['Octets'] = item.Octets;
            container['Correcteds'] = item.Correcteds;
            container['Uncorrectables'] = item.Uncorrectables;

            return container;

        }),
        upstream: jsonReponse.slice(options.downstreamChannels, options.downstreamChannels + options.upstreamChannels).map(item => {
            const container = {};

            container['UCID'] = item.DCID;
            container['Freq'] = item.Freq;
            container['Power'] = item.Power;
            container['ChannelType'] = item.SNR;
            container['SymbolRate'] = item.Modulation;
            container['Modulation'] = item.Octets;

            return container;
        })
    }

    fs.writeFile('output.json', JSON.stringify(msg, null, 4), (err) => {
        if (err) 
        console.log(err); 
      else { 
        console.log("File written successfully\n"); 
      } 
    });

    return msg
});

function getColHeadings(headingRow) {
    const alreadySeen = {}

    $(headingRow).find('td').each( (j, cell) => {
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

function processRow(i, row) {
    const rowJson = {}

    if (options.ignoreHeadingRow && i === options.rowForHeadings) return
    // TODO: Process options.ignoreRows

    $(row).find('td').each((j, cell) => {
        let q = j+1;
        rowJson[columnHeadings[q]] = $(cell).text().trim()

    })

    // Skip blank rows
    if (JSON.stringify(rowJson) !== '{}') jsonReponse.push(rowJson)
}
//EOF
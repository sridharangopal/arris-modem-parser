/*jshint sub:true,asi:true,maxerr:1000*/

const cheerio = require('cheerio')
const request = require('request')
const fs = require('fs')

const url = "https://192.168.100.1/cgi-bin/status_cgi"
var msg = {}
const tableSelector = 'table'
const options = {
    rowForHeadings: 1,  // extract th cells from this row for column headings (zero-based)
    ignoreHeadingRow: true, // Don't treat the heading row as data
    ignoreRows: [],
}
const jsonReponse = []
const columnHeadings = []
var $ = ""

request.get(url, { json: true, strictSSL: false }, (err, res, body) => {
    if (err) {
        return console.log(err);
    }
    // console.log(body);

    $ = cheerio.load(body)

    $(tableSelector).each(function (i, table) {
        var trs = $(table).find('tr')

        // Set up the column heading names
        getColHeadings($(trs[options.rowForHeadings]))

        // Process rows for data
        $(table).find('tr').each(processRow)
    })

    msg.payload = {
        columnHeadings: columnHeadings,
        rows: jsonReponse,
    }

    console.log(JSON.stringify(msg))

    

    return msg
});

function getColHeadings(headingRow) {
    const alreadySeen = {}

    $(headingRow).find('td').each(function (j, cell) {
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

    $(row).find('td').each(function (j, cell) {
        rowJson[columnHeadings[j]] = $(cell).text().trim()
    })

    // Skip blank rows
    if (JSON.stringify(rowJson) !== '{}') jsonReponse.push(rowJson)
}
//EOF
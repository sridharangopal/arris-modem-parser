import { sendArrisDataToInflux } from './main.mjs'
import { scheduleJob } from 'node-schedule'

const schedule_string = process.env.SCHEDULE_STRING

const job = scheduleJob(schedule_string, () => {
    console.log('Running the main file now: ' + new Date())
    sendArrisDataToInflux()
})
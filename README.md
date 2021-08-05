# Arris Modem Status Page Parser

## Overview

- This nodejs app parses the Arris modem's status page which is typically at https://192.168.100.1/cgi-bin/status_cgi
- The program comes configured for a 32 download channel by 4 upload channel modem
- The options object in the code can be modified for modems with a different number of download and upload channels
- Only the download channel stats are sent to Influx Cloud
- You will need to provide the following environment variables on your local .env file to be able to run this locally
  - MODEM_USERNAME
  - MODEM_PASSWORD
  - INFLUX_URL
  - INFLUX_ORG
  - INFLUX_TOKEN
  - INFLUX_BUCKET_ID
  - WRITE_FILE
  - SCHEDULE_STRING


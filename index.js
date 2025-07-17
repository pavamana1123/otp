const moment = require("moment")
const consolas = console.log
console.log = function (...args) {
  const timestamp = new Date().toISOString()
  consolas.apply(console, [`[${moment(timestamp).format("YY-MMM-DD HH:mm")}]`, ...args])
}

async function main() {
  const express = require('express')
  const axios = require('axios')
  const otpGenerator = require('otp-generator')

  const app = express()
  app.use(express.json())
  const port = 4005

  var cred = require("./cred.js")
  const DB = require("./db.js")

  cred.mysql.connectionLimit = 100
  cred.mysql.multipleStatements = true

  var mysql = require('mysql')
  var db = new DB(mysql.createPool(cred.mysql))

  const wameURL = 'https://wame.iskconmysore.org'
  const template = 'otp_in'

  const sendOTP = (target, title, otp) => {
      return axios.post(wameURL, {
        phone: target,
        template,
        values: [otp],
        buttons: { "0": [otp] }
      }, {
        headers: {
          "api-key": cred.wame.apiKey
        }
      })
  }

  app.post('/data', (req, res) => {
    var endpoint = req.get("endpoint")
    var reqAPIKey = req.get("api-key")


    if (cred.apiKey == reqAPIKey) {
      const { title, id, otp, target, len } = req.body

      console.log(`${endpoint} - ${target} - ${id}`)

      if (endpoint == "/send") {
        const otpGen = otpGenerator.generate(len || 6, { upperCaseAlphabets: false, lowerCaseAlphabets: false, specialChars: false })
        sendOTP(target, title, otpGen)
          .then(r => {
            db.storeOTP(id, otpGen, target)
              .then(r => {
                res.status(200).send(r)
              }).catch((err) => {
                res.status(500).send(err)
              })
          }).catch(err => {
            console.log(err)
            res.status(err.response.status).send(err.response.data.message)
          })
      } else if (endpoint == "/verify") {
        db.verifyOTP(id, otp)
          .then(r => {
            res.status(200).send(r)
          }).catch(({ status, error }) => {
            res.status(status).send(error)
          })
      } else {
        res.status(400).send()
      }
    } else {
      res.status(401).send()
    }
  })

  app.listen(port, () => {
    console.log(`OTP app listening at http://localhost:${port}`)
  })

  setInterval(() => {
    db.exec(`delete FROM iskconmy_otp.otp where expiry<=now();`)
      .then((result) => {
        if (result.affectedRows > 0) {
          console.log(`${result.affectedRows} OTP expired.`)
        }
      })

  }, 60 * 1000)
}

main().catch((e) => {
  console.error(e)
})

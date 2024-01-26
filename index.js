async function main() {
  const express = require('express')
  const app = express()
  app.use(express.json()) 
  const port = 4005

  const API  = require("./api.js")
  var cred = require("./cred.js")
  const DB = require("./db.js")
  const Mail = require("./mail.js")

  cred.mysql.connectionLimit = 100
  cred.mysql.multipleStatements = true

  var mysql = require('mysql');
  var db = new DB(mysql.createPool(cred.mysql))
  var mail = new Mail(cred.mail)
  await mail.verify()

  const api = new API(db, mail)
  app.post('/data', api.call.bind(api))

  app.listen(port, () => {
    console.log(`OTP app listening at http://localhost:${port}`)
  })

  setInterval(() => {
    var query = `delete FROM iskconmy_otp.otp where expiry<=now();`
    db.execQuery(query)
    .then((result) => {
        if(result.affectedRows>0){
          console.log(`${result.affectedRows} OTP expired.`)
        }
    })
    
  }, 60000)
}

main().catch((e) => {
  console.error(e)
})

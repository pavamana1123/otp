const nodemailer = require('nodemailer')

class Mail {
  constructor(cred){
      this.transporter = nodemailer.createTransport(cred)
  }

  async verify(){
    return new Promise((resolve, reject) => {
        this.transporter.verify((error, success) => {
          if (error || !success) {
            return reject(error || new Error("Mail transporter verificaton not succesfull"))
          } else {
            resolve()
          }
        })
    })
  }

  async send(mailOptions){
    return new Promise((resolve, reject) => {
      this.transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          return reject(error)
        } else {
          resolve(info.response)
        }
      })
    })
  }
}

module.exports = Mail

  

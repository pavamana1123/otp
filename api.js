var cred = require("./cred.js")

class API {
    constructor(db, mail){
        this.db = db
        this.mail = mail
    }

    async call(req, res) {

        console.log(`api - ${req.get("endpoint")}`)

        var reqAPIKey = req.get("api-key")
        if(cred.apiKey != reqAPIKey){
            this.sendError(res, 401, "API Key mismatch")
            return
        }
        
        switch(req.get("endpoint")){

            case "/send":
                this.sendOtp(req, res)
                break    

            case "/verify":
                this.verifyOtp(req, res)
                break

            default:
                res.status(404)
                res.send()
        }
    }

    async sendOtp(req, res){
        const { id, expiry, otpLength, target, title } = req.body
        const otp = this.createOtp(otpLength)
        var err = await this.storeOtp(otp, expiry, id, phone)
        if(err){
            return err
        }
        if(target.includes("@")){
            try {
                await this.mail.send({
                    from: 'admin@otp.iskconmysore.org',
                    to: target,
                    subject: title || 'OTP from ISKCON Mysore',
                    text: `Hare Krishna!\nYour OTP is ${otp}`
                })
                res.send()
            }catch(error){
                this.sendError(res, 500, error)
            }

        }else{
            this.sendWhatsAppMessage(otp, target, title || 'OTP from ISKCON Mysore',  res)
        }
    }

    verifyOtp(req, res){
        const { id, otp } = req.body
        var query = `select otp from otp where id='${id}'`
        this.db.execQuery(query)
        .then((result) => {
            if(result.length==0){
                res.status(404)
                res.send(JSON.stringify({err: "OTP not generated"}))
            }else{
                if(result[0].otp==otp){
                    res.send()
                }else{
                    res.status(403)
                    res.send(JSON.stringify({err: "OTP mismatch"}))
                }
            }
        })
    }

    createOtp(len){
        const otpGenerator = require('otp-generator')
        return otpGenerator.generate(len||6, { upperCaseAlphabets: false, lowerCaseAlphabets: false, specialChars: false });
    }

    async storeOtp(otp, expiry, id, phone){
        expiry = expiry || 300
        var query = `insert into otp (id, phone, otp, expiry) values("${id}","${phone}","${otp}", now()+ interval ${expiry} second)
        on duplicate key update otp="${otp}", expiry=now()+ interval ${expiry} second, phone="${phone}"`
        this.db.execQuery(query)
        .then((result) => {
            if(result.affectedRows==0){
                return new error("No rows affected")
            }
        })
    }

    sendWhatsAppMessage(otp, phoneNumber, title, res){
        fetch(cred.whatsapp.url, {
            method: 'POST',
            headers: {
                'content-type': 'text/json',
                Authorization: cred.whatsapp.auth
            },
            body: JSON.stringify({
                countryCode: "+91",
                phoneNumber,
                type: "Template",
                template: {
                  name: "ekakalika_guhyapadam",
                  languageCode: "en",
                  headerValues: [title],
                  bodyValues: [
                    "OTP",
                    otp
                  ]
                }
            })
        })
        .then(res => res.json())
        .then(json => {
            res.send(json)
        })
        .catch(err => {
            res.status(500)
            res.send(JSON.stringify({err}))
        });
    }

    sendError(res, code, msg){
        res.status(code)
        res.send({"error":msg})
    }
}

module.exports = API
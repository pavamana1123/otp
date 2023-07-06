var cred = require("./cred.js")

class API {
    constructor(db, mail){
        this.db = db
        this.mail = mail
    }

    async call(req, res) {

        var self = this
        console.log(`api - ${req.get("endpoint")}`)
        
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
        const { id, phone, expiry, otpLength, email } = req.body
        const otp = this.createOtp(otpLength)
        var err = await this.storeOtp(otp, expiry, id, phone)
        if(err){
            return err
        }
        if(email){
            try {
                await this.mail.send({
                    from: 'admin@otp.iskconmysore.org',
                    to: email,
                    subject: 'OTP from ISKCON Mysore',
                    text: `Hare Krishna!\nYour OTP is ${otp}`
                })
                res.send()
            }catch(error){
                this.sendError(res, 500, error)
            }

        }else{
            this.sendWATIMessage(otp, phone, res)
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

    sendWATIMessage(otp, phone, res){
        fetch(`${cred.wati.url}?whatsappNumber=91${phone}`, {
            method: 'POST',
            headers: {
                'content-type': 'text/json',
                Authorization: cred.wati.auth
            },
            body: JSON.stringify({
                parameters: [{name: 'otp', value: otp}],
                broadcast_name: 'otp',
                template_name: 'otp'
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
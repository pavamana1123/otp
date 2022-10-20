class API {
    constructor(db){
        this.db = db
    }

    call(req, res) {

        var {body} = req
        var self = this
        console.log(`api - ${req.get("endpoint")}`)
        
        switch(req.get("endpoint")){

            case "/send":

               
                break    

            default:
                res.status(404)
                res.send()
        }
    }

    async sendOtp(req){
        const { id, phone, expiry, otpLength } = req.body
        const otp = this.createOtp(otpLength)
        var err = await this.storeOtp(otp, expiry, id, phone)

    }

    createOtp(len){
        const otpGenerator = require('otp-generator')
        return otpGenerator.generate(len||6, { upperCaseAlphabets: false, lowerCaseAlphabets: false, specialChars: false });
    }

    async storeOtp(otp, expiry, id, phone){
        var query = `insert into otp (id, phone, otp, expiry) values("${id}","${phone}","${otp}", now()+ interval ${expiry} second)
        on duplicate key update otp="${otp}", expiry=now()+ interval ${expiry} second`
        self.execQuery(query)
        .then((result) => {
            if(result.affectedRows==0){
                return new error("No rows affected")
            }
        })
    }


    execQuery(q){
        return new Promise((resolve, reject) => {
            this.db.query(q, (e, result) => {
                if (e) {
                    return reject(e)
                };  
                resolve(result)
            });
        });
    }

    sendError(res, code, msg){
        res.status(code)
        res.send({"error":msg})
    }
}



module.exports = API
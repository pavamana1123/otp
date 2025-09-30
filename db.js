class DB {
    constructor(db){
        this.db=db
    }

    exec(q){
        return new Promise((resolve, reject) => {
            this.db.query(q, (e, result) => {
                if (e) {
                    return reject(e)
                }  
                resolve(result)
            })
        })
    }

    storeOTP(id, otp, target, expiry){
        expiry = expiry || 300
        return new Promise((resolve, reject) => {
            this.db.query(
                `insert into otp (id, target, otp, expiry) values("${id}","${target}","${otp}", now()+ interval ${expiry} second)
                on duplicate key update otp="${otp}", expiry=now()+ interval ${expiry} second, target="${target}"`,

                (error, result) => {
                    if(error){
                        reject(error)
                    }else{
                        if(result.affectedRows>0){
                            resolve()
                        }else{
                            reject("No rows affected")
                        }
                    }
                }
            )
        })
    }

    verifyOTP(id, otp){

        return new Promise((resolve, reject) => {
            console.log(`select otp from otp where id='${id}'`)
            this.db.query(
                `select otp from otp where id='${id}'`,

                (error, result) => {
                    if(error){
                        reject(error)
                    }else{
                        if(result.length==0){
                            reject({status: 404, error: "OTP not found"})
                        }else{
                            if(result[0].otp==otp){
                                resolve()
                            }else{
                                reject({status: 403, error: "OTP mismatch"})
                            }
                        }
                    }
                }
            )
        })

    }
}

module.exports = DB
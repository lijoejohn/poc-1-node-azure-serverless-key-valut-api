const {
    app
} = require('@azure/functions');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userName: String,
    passWord: String,
    userType: String,
    name: String
});

app.http('login', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(
            `Http function processed request for url "${request.url}"`
        );
        try {
            await mongoose.connect(
                `mongodb://${process.env["MONGO_DB_HOST"]}`, {
                    user: process.env["DB_USER"],
                    pass: process.env["PASS"],
                    dbName: process.env["DB"]
                });
            const Users = mongoose.model('Users', userSchema);
            const body = await request.json();
            const {
                userName,
                passWord
            } = body;
            if (typeof userName !== 'undefined' && userName !== '' && typeof passWord !== 'undefined' && passWord !== '') {
                const modelInstances = await Users.findOne({
                    userName,
                    passWord
                }).exec();
                if (modelInstances) {
                    let {
                        passWord,
                        ...rest
                    } = modelInstances;
                    const token = jwt.sign(rest, process.env[
                        "JWT_SECRET_KEY"]);
                    return {
                        jsonBody: {
                            data: {
                                name: modelInstances.name,
                                token
                            },
                        }
                    };
                }
                return {
                    status: 401
                };
            }
            return {
                status: 401
            };
        }
        catch (error) {
            console.error(error.message);
            return {
                jsonBody: `Error, ${error.message}!`, status: 500
            };
        }
    }
});
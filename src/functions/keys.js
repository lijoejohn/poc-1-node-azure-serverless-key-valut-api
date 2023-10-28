const { app } = require('@azure/functions');
const jwt = require('jsonwebtoken');
const { DefaultAzureCredential } = require("@azure/identity");
const { SecretClient } = require("@azure/keyvault-secrets");
const mongoose = require('mongoose');

const keySchema = new mongoose.Schema({
    key: String,
    name: String,
    type: String,
    subKeys: [{key: String, name: String}]
});

app.http('keys', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`Http function processed request for url "${request.url}"`);
        const token = request.headers.get("Authorization")?.split(' ')[1];
        if (token !== '' && typeof token !=='undefined') 
        {
            const verified = jwt.verify(token, process.env[
                "JWT_SECRET_KEY"]);
            if(verified){
                await mongoose.connect(
                    `mongodb://${process.env["MONGO_DB_HOST"]}`, {
                        user: process.env["DB_USER"],
                        pass: process.env["PASS"],
                        dbName: process.env["DB"]
                    });
                const Keys = mongoose.model('Keys', keySchema);
                if(request.method==='GET')
                {
                    const modelInstances = await Keys.find().exec();
                    return {jsonBody: {data:modelInstances}}
                }
                if(request.method==='POST')
                {
                    const body = await request.json();
                    const { data } = body;
                    const subKeys = data.subKeys?.map((item)=>{
                        return {
                            key: item.key,
                            name: item.name
                        }
                    });
                    const key = new Keys({key:data.key, name:data.name, type: data.type, subKeys: subKeys });
                    const savedItem = await key.save()
                    const credential = new DefaultAzureCredential();
                    const client = new SecretClient(process.env.KEYVAULT_URI, credential);
                    if(data.type==='single')
                        await client.setSecret(body.data.key, data.value);
                    else
                    {
                        data?.subKeys?.forEach(async (element) => {
                            await client.setSecret(element.key, element.value);
                        });
                    }
                    const modelInstances = await Keys.find().exec();
                    return {jsonBody: {data:savedItem}}
                }
            }
            return { status:401 };
        }
        return { status:401 };
    }
});

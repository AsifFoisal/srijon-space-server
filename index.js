import express from "express";
import { MongoClient } from 'mongodb';
import 'dotenv/config'

const app = express()
const PORT = 8000

const client = new MongoClient(process.env.MONGODB_URI);
export async function connectToMongoDB() {
    try {
        await client.connect();
        console.log("You successfully connected to MongoDB!");
        return client;
    } catch (err) {
        console.dir(err);
    }
}

const mongoClient = await connectToMongoDB();
const db = mongoClient.db("studiospace")
const studiosCollection = db.collection("studios")

app.get('/', (req,res) => {
    res.send({message:"Hello"})
})

app.get('/')

app.listen(PORT, ()=>{
    console.log(`Server Running at Port ${PORT}`);
})

export default app
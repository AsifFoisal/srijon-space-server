import express from "express";
import { MongoClient, ObjectId } from 'mongodb';
import cors from 'cors';
import 'dotenv/config'

const app = express()
const PORT = 8000

app.use(cors())
app.use(express.json())

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
const db = mongoClient.db("srijonspace")
const studiosCollection = db.collection("studios")
const bookingsCollection = db.collection("bookings")

app.get('/', (req, res) => {
    res.send({ message: "Hello" })
})

app.get("/studios", async (req, res) => {
    const limit = Number(req.query.limit) || 0;
    let query = studiosCollection.find({});
    if (limit > 0) {
        query = query.sort({ createdAt: -1, _id: -1 }).limit(limit);
    }
    const result = await query.toArray();
    res.send(result);
});

app.get("/my-studios/:email", async (req, res) => {
    const { email } = req.params;
    const result = await studiosCollection.find({ ownerEmail: email }).toArray();
    res.send(result);
});

app.get("/studio/:id", async (req, res) => {
    const { id } = req.params;
    const result = await studiosCollection.findOne({_id: new ObjectId(id),});
    res.send(result);
});

app.get("/my-bookings/:email", async (req, res) => {
    const { email } = req.params;
    const result = await bookingsCollection.find({ userEmail: email }).toArray();
    res.send(result);
});

app.post("/add-studio", async (req, res) => {
    const data = req.body;
    const result = await studiosCollection.insertOne(data);
    res.send(result);
});

app.post("/my-bookings", async (req, res) => {
    const data = req.body;
    const result = await bookingsCollection.insertOne(data);
    res.send(result);
});

app.patch("/my-bookings/:id", async (req, res) => {
    const { id } = req.params;
    const result = await bookingsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: req.body }
    );
    res.send(result);
});


app.patch("/my-studios/:id", async (req, res) => {
    const { id } = req.params;
    const result = await studiosCollection.updateOne({ _id: new ObjectId(id) },{ $set: req.body },
    );
    res.send(result);
});

app.delete("/my-studios/:id", async (req, res) => {
    const { id } = req.params;
    const result = await studiosCollection.deleteOne({
        _id: new ObjectId(id),
    });
    res.send(result);
});

app.delete("/my-bookings/:id", async (req, res) => {
    const { id } = req.params;
    const result = await bookingsCollection.deleteOne({
        _id: new ObjectId(id),
    });
    res.send(result);
});

app.listen(PORT, () => {
    console.log(`Server Running at Port ${PORT}`);
})

export default app
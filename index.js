import express from "express";
import { MongoClient, ObjectId } from 'mongodb';
import cors from 'cors';
import 'dotenv/config'
import { createRemoteJWKSet, jwtVerify } from "jose";

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
const reviewsCollection = db.collection("reviews")


const verifyToken = async(req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    
    if(!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const JWKS = createRemoteJWKSet(new URL(`${process.env.NEXT_PUBLIC_AUTH_URL}/api/auth/jwks`));

    try{
        const { payload } = await jwtVerify(token, JWKS)
    }
    catch(err){
        return res.status(401).json({ message: "Server Error" });
    }

    next();
}


app.get('/', (req, res) => {
    res.send({ message: "Hello" })
})

const ratingPipeline = [
    {
        $lookup: {
            from: "reviews",
            localField: "_id",
            foreignField: "studioId",
            as: "reviews",
        },
    },
    {
        $addFields: {
            rating: {
                $cond: [
                    { $gt: [{ $size: "$reviews" }, 0] },
                    { $round: [{ $avg: "$reviews.rating" }, 1] },
                    null,
                ],
            },
            reviewCount: { $size: "$reviews" },
        },
    },
    { $unset: "reviews" },
];

app.get("/studios", async (req, res) => {
    const limit = Number(req.query.limit) || 0;
    const base = limit > 0 ? [{ $sort: { createdAt: -1, _id: -1 } }, { $limit: limit }] : [];
    const result = await studiosCollection.aggregate([...base, ...ratingPipeline]).toArray();
    res.send(result);
});

app.get("/my-studios/:email", verifyToken, async (req, res) => {
    const { email } = req.params;
    const result = await studiosCollection.find({ ownerEmail: email }).toArray();
    res.send(result);
});

app.get("/studios/:id",verifyToken, async (req, res) => {
    const { id } = req.params;
    const [result] = await studiosCollection
        .aggregate([{ $match: { _id: new ObjectId(id) } }, ...ratingPipeline])
        .toArray();
    res.send(result ?? null);
});

app.get("/my-bookings/:email", verifyToken, async (req, res) => {
    const { email } = req.params;
    const result = await bookingsCollection.find({ userEmail: email }).toArray();
    res.send(result);
});

app.post("/add-studio", verifyToken,async (req, res) => {
    const data = req.body;
    const result = await studiosCollection.insertOne(data);
    res.send(result);
});

app.post("/my-bookings",verifyToken, async (req, res) => {
    const data = req.body;
    const result = await bookingsCollection.insertOne(data);
    res.send(result);
});

app.patch("/my-bookings/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    const result = await bookingsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: req.body }
    );
    res.send(result);
});



app.patch("/my-studios/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    const result = await studiosCollection.updateOne({ _id: new ObjectId(id) },{ $set: req.body },
    );
    res.send(result);
});

app.delete("/my-studios/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    const result = await studiosCollection.deleteOne({
        _id: new ObjectId(id),
    });
    res.send(result);
});

app.delete("/my-bookings/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    const result = await bookingsCollection.deleteOne({
        _id: new ObjectId(id),
    });
    res.send(result);
});

app.get("/studios/:id/reviews", verifyToken, async (req, res) => {
    const { id } = req.params;
    const result = await reviewsCollection
        .find({ studioId: new ObjectId(id) })
        .sort({ createdAt: -1 })
        .toArray();
    res.send(result);
});

app.post("/studios/:id/reviews", verifyToken, async (req, res) => {
    const { id } = req.params;
    const { rating, text, name, email, avatar } = req.body;
    const result = await reviewsCollection.updateOne(
        { studioId: new ObjectId(id), email },
        {
            $set: {
                studioId: new ObjectId(id),
                name,
                email,
                avatar,
                rating: Number(rating),
                text,
                createdAt: new Date(),
            },
        },
        { upsert: true }
    );
    res.send(result);
});

app.get("/host-bookings/:email", verifyToken, async (req, res) => {
    const { email } = req.params;
    const studios = await studiosCollection.find({ ownerEmail: email }).toArray();
    const ids = studios.map((studio) => String(studio._id));
    const result = await bookingsCollection
        .find({ studioId: { $in: ids } })
        .sort({ createdAt: -1 })
        .toArray();
    res.send(result);
});

app.listen(PORT, () => {
    console.log(`Server Running at Port ${PORT}`);
})

export default app
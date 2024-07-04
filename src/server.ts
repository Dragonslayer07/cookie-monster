import express, { Request, Response } from 'express';
import { GemType, Media, MediaType, PrismaClient, VoteType } from '@prisma/client';
import os from 'os';
import HealthcheckController from "./api/HealthcheckController";


const prisma = new PrismaClient();
const app = express();
app.use(express.json());

// Function to get the local IP address
function getLocalIPAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name]!) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return '127.0.0.1';
}

// Start the server and log the local IP address
const port = 3000;
const localIP = getLocalIPAddress();

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
    console.log(`Local IP address: http://${localIP}:${port}`);
});

app.use('/', HealthcheckController);

// TypeScript interfaces
interface MediaInput {
    uri: string;
    type: MediaType;
}

interface CreateGemRequest {
    userId: number;
    title: string;
    description: string;
    media: MediaInput[];
    location: {
        latitude: number;
        longitude: number;
    };
    type: GemType;
}

// Haversine formula to calculate the distance between two points on the Earth's surface
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6371; // Radius of Earth in kilometers
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// API endpoints
app.get('/users/:user_id/gems', async (req: Request, res: Response) => {
    const { user_id } = req.params;
    const { include_mined } = req.query;

    // Fetch gems created by the user
    const createdGems = await prisma.gem.findMany({
        where: {
            authorId: Number(user_id),
        },
        include: {
            author: true,
            media: true,
            votes: true,
        },
    });

    let gems = createdGems;

    // If include_mined is true, also fetch gems the user has upvoted or downvoted
    if (include_mined === 'true') {
        const votedGems = await prisma.vote.findMany({
            where: { userId: Number(user_id) },
            include: {
                gem: {
                    include: {
                        author: true,
                        media: true,
                        votes: true,
                    },
                },
            },
        });

        // Combine created and voted gems, avoiding duplicates
        const gemMap = new Map<number, typeof createdGems[0]>();
        createdGems.forEach(gem => gemMap.set(gem.id, gem));
        votedGems.forEach(vote => gemMap.set(vote.gem.id, vote.gem));

        gems = Array.from(gemMap.values());
    }

    const result = gems.map(gem => ({
        id: gem.id,
        title: gem.title,
        description: gem.description,
        type: gem.type,
        latitude: gem.latitude,
        longitude: gem.longitude,
        author: {
            name: gem.author.username,
            profilePictureUrl: gem.author.profilePicture,
        },
        media: gem.media.map((media: Media) => ({
            uri: media.uri,
            type: media.type as MediaType,
        })),
        reviewDetails: {
            count: gem.votes.length,
            upvotePercentage: gem.votes.length > 0 ? (gem.votes.filter(vote => vote.type === VoteType.UPVOTE).length / gem.votes.length) * 100 : 0,
        },
    }));

    return res.json({ gems: result });
});

app.get('/cities/:cityCode/gems', async (req: Request, res: Response) => {
    const { cityCode } = req.params;
    if (cityCode === 'GLOBAL') {
        const { top } = req.query;

        let gems = await prisma.gem.findMany({
            include: {
                author: true,
                media: true,
                votes: true,
            },
        });

        if (top === 'true') {
            gems = gems.sort((a, b) => {
                const aUpvotes = a.votes.filter(vote => vote.type === VoteType.UPVOTE).length;
                const bUpvotes = b.votes.filter(vote => vote.type === VoteType.UPVOTE).length;
                return bUpvotes - aUpvotes;
            }).slice(0, 10);
        }

        const result = gems.map(gem => ({
            id: gem.id,
            title: gem.title,
            description: gem.description,
            type: gem.type,
            latitude: gem.latitude,
            longitude: gem.longitude,
            author: {
                name: gem.author.username,
                profilePictureUrl: gem.author.profilePicture,
            },
            media: gem.media.map(media => ({
                uri: media.uri,
                type: media.type as MediaType,
            })),
            reviewDetails: {
                count: gem.votes.length,
                upvotePercentage: gem.votes.length > 0 ? (gem.votes.filter(vote => vote.type === VoteType.UPVOTE).length / gem.votes.length) * 100 : 0,
            },
        }));

        return res.json({ gems: result });
    }
    const { top } = req.query;

    const city = await prisma.city.findUnique({
        where: { code: cityCode },
        include: { gems: { include: { media: true, votes: true, author: true } } },
    });

    if (!city) {
        return res.status(404).json({ error: 'City not found' });
    }

    let gems = city.gems;

    if (top) {
        gems = gems.sort((a, b) => {
            const aUpvotes = a.votes.filter(vote => vote.type === VoteType.UPVOTE).length;
            const bUpvotes = b.votes.filter(vote => vote.type === VoteType.UPVOTE).length;
            return bUpvotes - aUpvotes;
        });
    }

    const result = gems.map(gem => ({
        id: gem.id,
        title: gem.title,
        description: gem.description,
        type: gem.type,
        latitude: gem.latitude,
        longitude: gem.longitude,
        author: {
            name: gem.author.username,
            profilePictureUrl: gem.author.profilePicture,
        },
        media: gem.media.map(media => ({
            uri: media.uri,
            type: media.type as MediaType,
        })),
        reviewDetails: {
            count: gem.votes.length,
            upvotePercentage: gem.votes.length > 0 ? (gem.votes.filter(vote => vote.type === VoteType.UPVOTE).length / gem.votes.length) * 100 : 0,
        },
    }));

    return res.json({ gems: result });
});

app.post('/gems/:gem_id/votes', async (req: Request, res: Response) => {
    const { gem_id } = req.params;
    const { userId, type } = req.body;

    const vote = await prisma.vote.create({
        data: {
            userId: Number(userId),
            gemId: Number(gem_id),
            type: type as VoteType,
        },
    });

    return res.json(vote);
});

app.post('/gems', async (req: Request, res: Response) => {
    const { userId, title, description, media, location, type }: CreateGemRequest = req.body;

    // Find the closest city
    const cities = await prisma.city.findMany();
    let closestCity = cities[0];
    let minDistance = getDistance(location.latitude, location.longitude, cities[0].latitude, cities[0].longitude);

    for (const city of cities) {
        const distance = getDistance(location.latitude, location.longitude, city.latitude, city.longitude);
        if (distance < minDistance) {
            closestCity = city;
            minDistance = distance;
        }
    }

    const gem = await prisma.gem.create({
        data: {
            title,
            description,
            type,
            latitude: location.latitude,
            longitude: location.longitude,
            authorId: Number(userId),
            cityCode: closestCity.code, // Assuming you have a cityCode field in your gem model
            media: {
                create: media.map((m: MediaInput) => ({
                    uri: m.uri,
                    type: m.type as MediaType,
                })),
            },
        },
    });

    return res.json(gem);
});

export default app;

const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // MongoDB connection options
        const options = {
            maxPoolSize: 10, // Maintain up to 10 socket connections
            serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
            bufferCommands: false // Disable mongoose buffering
        };

        const conn = await mongoose.connect(process.env.MONGODB_URI, options);

        console.log(`
🗄️  MongoDB Connected Successfully
📍 Host: ${conn.connection.host}
🏷️  Database: ${conn.connection.name}
🔗 Port: ${conn.connection.port}
        `);

        // Connection event handlers
        mongoose.connection.on('connected', () => {
            console.log('✅ Mongoose connected to MongoDB');
        });

        mongoose.connection.on('error', (err) => {
            console.error('❌ Mongoose connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('⚠️ Mongoose disconnected from MongoDB');
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            try {
                await mongoose.connection.close();
                console.log('🔴 MongoDB connection closed through app termination');
                process.exit(0);
            } catch (err) {
                console.error('Error during database shutdown:', err);
                process.exit(1);
            }
        });

    } catch (error) {
        console.error('❌ Database connection failed:', error.message);

        // Log additional connection details in development
        if (process.env.NODE_ENV === 'development') {
            console.error('Connection details:', {
                uri: process.env.MONGODB_URI?.replace(/\/\/.*@/, '//***:***@') // Hide credentials
            });
            console.log('🚀 Server starting without database connection (development mode)');
        } else {
            process.exit(1);
        }
    }
};

// Alternative PostgreSQL connection with Prisma
const initializePrisma = async () => {
    try {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient({
            log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
        });

        // Test the connection
        await prisma.$connect();

        console.log(`
🗄️  PostgreSQL Connected Successfully (Prisma)
🔗 Database URL: ${process.env.DATABASE_URL?.replace(/\/\/.*@/, '//***:***@')}
        `);

        // Graceful shutdown for Prisma
        process.on('beforeExit', async () => {
            await prisma.$disconnect();
            console.log('🔴 PostgreSQL connection closed (Prisma)');
        });

        return prisma;

    } catch (error) {
        console.error('❌ PostgreSQL connection failed:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
module.exports.initializePrisma = initializePrisma;